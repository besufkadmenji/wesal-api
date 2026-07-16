import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { PaymentPaginationInput } from './dto/payment-pagination.input';
import { ContractPaymentResponse } from './dto/contract-payment.response';
import { ConversationFeePaymentResponse } from './dto/conversation-fee-payment.response';
import { Payment } from './entities/payment.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { Conversation } from '../conversation/entities/conversation.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Category } from '../category/entities/category.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentPurpose } from './enums/payment-purpose.enum';
import { PayerType } from './enums/payer-type.enum';
import { PAYMENT_ERROR_MESSAGES } from './errors/payment.error-messages';
import { PAYMENT_ERROR_CODES } from './errors/payment.error-codes';
import { ContractService } from '../contract/contract.service';
import {
  MessageAddedPayload,
  MessageService,
} from '../conversation/message.service';
import { MessageKind } from '../conversation/enums/message-kind.enum';
import { ConversationStatus } from '../conversation/enums/conversation-status.enum';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

export type PaymentPayer = User | Provider;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    private readonly dataSource: DataSource,
    private readonly contractService: ContractService,
    private readonly messageService: MessageService,
  ) {}

  async settleContractPayment(
    contractId: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<ContractPaymentResponse> {
    if (principal.type === 'provider') {
      throw this.unauthorized(language);
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const contract = await manager.getRepository(Contract).findOne({
        where: { id: contractId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!contract) {
        throw this.notFound('CONTRACT_NOT_FOUND', language);
      }
      if (contract.clientId !== principal.sub) {
        throw this.unauthorized(language);
      }
      const obligationKey = this.obligationKey(
        PaymentPurpose.CONTRACT,
        contract.id,
        PayerType.USER,
        principal.sub,
      );
      const repository = manager.getRepository(Payment);
      const existing = await repository.findOne({ where: { obligationKey } });
      if (existing) {
        const wasCompleted = existing.status === PaymentStatus.COMPLETED;
        if (!wasCompleted) {
          Object.assign(existing, {
            amount: Number(contract.agreedPrice),
            commissionPercent: Number(contract.commissionPercent),
            commissionAmount: Number(contract.commissionAmount),
            vatRate: Number(contract.vatRate),
            vatAmount: Number(contract.vatAmount),
            paymentMethod: PaymentMethod.MOCK,
            status: PaymentStatus.COMPLETED,
            transactionReference: `MOCK:${obligationKey}`,
            gatewayResponse: JSON.stringify({
              success: true,
              gateway: 'mock',
            }),
          });
          await repository.save(existing);
        }
        const requiresTransition =
          contract.status !== ContractStatus.IN_PROGRESS;
        const currentContract = !requiresTransition
          ? contract
          : await this.contractService.transitionAfterPayment(
              contract.id,
              manager,
              language,
            );
        const event =
          requiresTransition || !wasCompleted
            ? await this.messageService.persistSystemEvent(
                contract.conversationId,
                MessageKind.CONTRACT_PAID,
                {
                  contractId: contract.id,
                  paymentId: existing.id,
                  amount: Number(existing.amount),
                },
                manager,
              )
            : null;
        return {
          payment: existing,
          contract: currentContract,
          event,
        };
      }

      const payment = repository.create({
        purpose: PaymentPurpose.CONTRACT,
        payerId: principal.sub,
        payerType: PayerType.USER,
        obligationKey,
        contractId: contract.id,
        conversationId: contract.conversationId,
        categoryId: contract.categoryId,
        amount: Number(contract.agreedPrice),
        commissionPercent: Number(contract.commissionPercent),
        commissionAmount: Number(contract.commissionAmount),
        vatRate: Number(contract.vatRate),
        vatAmount: Number(contract.vatAmount),
        configSnapshot: {
          contractVersion: contract.version,
          depositPercent: Number(contract.depositPercent),
          downPayment: Number(contract.downPayment),
        },
        paymentMethod: PaymentMethod.MOCK,
        status: PaymentStatus.COMPLETED,
        transactionReference: `MOCK:${obligationKey}`,
        gatewayResponse: JSON.stringify({ success: true, gateway: 'mock' }),
        notes: 'Sprint 3 mock contract settlement; no money moved.',
      });
      const savedPayment = await repository.save(payment);
      const updatedContract = await this.contractService.transitionAfterPayment(
        contract.id,
        manager,
        language,
      );
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        MessageKind.CONTRACT_PAID,
        {
          contractId: contract.id,
          paymentId: savedPayment.id,
          amount: Number(savedPayment.amount),
        },
        manager,
      );
      return { payment: savedPayment, contract: updatedContract, event };
    });
    if (result.event) {
      await this.publishSafely(result.event);
    }
    return { payment: result.payment, contract: result.contract };
  }

  async settleConversationFee(
    conversationId: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<ConversationFeePaymentResponse> {
    const result = await this.dataSource.transaction(async (manager) => {
      const conversation = await manager.getRepository(Conversation).findOne({
        where: { id: conversationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!conversation) {
        throw this.notFound('CONVERSATION_NOT_FOUND', language);
      }
      const isProvider = principal.type === 'provider';
      const isParticipant = isProvider
        ? conversation.providerId === principal.sub
        : conversation.userId === principal.sub;
      if (!isParticipant) {
        throw this.unauthorized(language);
      }
      const listing = await manager.getRepository(Listing).findOne({
        where: { id: conversation.listingId },
      });
      const category = listing
        ? await manager.getRepository(Category).findOne({
            where: { id: listing.categoryId },
          })
        : null;
      const enabled = isProvider
        ? Boolean(category?.providerConversationFeeEnabled)
        : Boolean(category?.customerConversationFeeEnabled);
      const amount = Number(
        isProvider
          ? (category?.providerConversationFee ?? 0)
          : (category?.customerConversationFee ?? 0),
      );
      const paidAt = isProvider
        ? conversation.providerFeePaidAt
        : conversation.customerFeePaidAt;
      const feeRequired = enabled && amount > 0;
      const purpose = isProvider
        ? PaymentPurpose.CHAT_PROVIDER
        : PaymentPurpose.CHAT_CUSTOMER;
      const payerType = isProvider ? PayerType.PROVIDER : PayerType.USER;
      const obligationKey = this.obligationKey(
        purpose,
        conversation.id,
        payerType,
        principal.sub,
      );
      const repository = manager.getRepository(Payment);
      const existing = await repository.findOne({ where: { obligationKey } });

      if (!feeRequired || paidAt) {
        return {
          payment: existing,
          conversation,
          access: {
            feeRequired,
            feeAmount: amount,
            paidAt,
            canSend: conversation.status === ConversationStatus.ACTIVE,
          },
          event: null as MessageAddedPayload | null,
        };
      }

      let payment = existing;
      if (!payment) {
        payment = await repository.save(
          repository.create({
            purpose,
            payerId: principal.sub,
            payerType,
            obligationKey,
            contractId: null,
            conversationId: conversation.id,
            categoryId: category?.id ?? null,
            amount,
            commissionPercent: 0,
            commissionAmount: 0,
            vatRate: 0,
            vatAmount: 0,
            configSnapshot: { enabled, amount },
            paymentMethod: PaymentMethod.MOCK,
            status: PaymentStatus.COMPLETED,
            transactionReference: `MOCK:${obligationKey}`,
            gatewayResponse: JSON.stringify({ success: true, gateway: 'mock' }),
            notes: 'Sprint 3 mock conversation fee; no money moved.',
          }),
        );
      } else if (payment.status !== PaymentStatus.COMPLETED) {
        Object.assign(payment, {
          amount,
          commissionPercent: 0,
          commissionAmount: 0,
          vatRate: 0,
          vatAmount: 0,
          configSnapshot: { enabled, amount },
          paymentMethod: PaymentMethod.MOCK,
          status: PaymentStatus.COMPLETED,
          transactionReference: `MOCK:${obligationKey}`,
          gatewayResponse: JSON.stringify({ success: true, gateway: 'mock' }),
        });
        payment = await repository.save(payment);
      }
      const now = new Date();
      if (isProvider) {
        conversation.providerFeePaidAt = now;
      } else {
        conversation.customerFeePaidAt = now;
      }
      const savedConversation = await manager
        .getRepository(Conversation)
        .save(conversation);
      const event = await this.messageService.persistSystemEvent(
        conversation.id,
        MessageKind.CHAT_FEE_PAID,
        {
          paymentId: payment.id,
          payerType,
          amount,
        },
        manager,
      );
      return {
        payment,
        conversation: savedConversation,
        access: {
          feeRequired: true,
          feeAmount: amount,
          paidAt: now,
          canSend: savedConversation.status === ConversationStatus.ACTIVE,
        },
        event,
      };
    });
    if (result.event) {
      await this.publishSafely(result.event);
    }
    return {
      payment: result.payment,
      conversation: result.conversation,
      access: result.access,
    };
  }

  async findAll(
    input: PaymentPaginationInput,
    principal?: JwtPayload,
  ): Promise<IPaginatedType<Payment>> {
    const {
      page = 1,
      limit = 10,
      contractId,
      conversationId,
      purpose,
      status,
      paymentMethod,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = input;
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.contract', 'contract')
      .leftJoinAndSelect('payment.conversation', 'conversation');
    if (principal) {
      query.andWhere('payment.payerId = :payerId', {
        payerId: principal.sub,
      });
      query.andWhere('payment.payerType = :payerType', {
        payerType:
          principal.type === 'provider' ? PayerType.PROVIDER : PayerType.USER,
      });
    }
    if (contractId) {
      query.andWhere('payment.contractId = :contractId', { contractId });
    }
    if (conversationId)
      query.andWhere('payment.conversationId = :conversationId', {
        conversationId,
      });
    if (purpose) query.andWhere('payment.purpose = :purpose', { purpose });
    if (status) query.andWhere('payment.status = :status', { status });
    if (paymentMethod)
      query.andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod,
      });
    const [items, total] = await query
      .orderBy(
        sortBy ? `payment.${sortBy}` : 'payment.createdAt',
        sortOrder === SortOrder.DESC ? 'DESC' : 'ASC',
      )
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const totalPages = Math.ceil(total / limit);
    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['contract', 'conversation'],
    });
    if (!payment) {
      throw this.notFound('PAYMENT_NOT_FOUND', language);
    }
    const payerType =
      principal.type === 'provider' ? PayerType.PROVIDER : PayerType.USER;
    if (payment.payerId !== principal.sub || payment.payerType !== payerType) {
      throw this.unauthorized(language);
    }
    return payment;
  }

  async resolvePayer(payment: Payment): Promise<PaymentPayer | null> {
    return payment.payerType === PayerType.PROVIDER
      ? this.providerRepository.findOne({ where: { id: payment.payerId } })
      : this.userRepository.findOne({ where: { id: payment.payerId } });
  }

  private obligationKey(
    purpose: PaymentPurpose,
    targetId: string,
    payerType: PayerType,
    payerId: string,
  ): string {
    return `${purpose}:${targetId}:${payerType}:${payerId}`;
  }

  private unauthorized(language: LanguageCode): I18nBadRequestException {
    const message = I18nService.translate(
      PAYMENT_ERROR_MESSAGES[PAYMENT_ERROR_CODES.UNAUTHORIZED_ACCESS],
      language,
    );
    return new I18nBadRequestException({ en: message, ar: message }, language);
  }

  private notFound(
    code: 'PAYMENT_NOT_FOUND' | 'CONTRACT_NOT_FOUND' | 'CONVERSATION_NOT_FOUND',
    language: LanguageCode,
  ): I18nNotFoundException {
    const message = I18nService.translate(
      PAYMENT_ERROR_MESSAGES[PAYMENT_ERROR_CODES[code]],
      language,
    );
    return new I18nNotFoundException({ en: message, ar: message }, language);
  }

  private async publishSafely(payload: MessageAddedPayload): Promise<void> {
    try {
      await this.messageService.publish(payload);
    } catch (error) {
      this.logger.warn(
        `Payment event persisted but realtime publish failed: ${String(error)}`,
      );
    }
  }
}
