import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
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
import { SettingService } from '../setting/setting.service';
import { SearchService } from '../search/search.service';
import { ListingType, PromotionStatus } from '../listing/enums/listing.enum';
import { paymentGatewayConfig } from './gateway/payment-gateway.config';

export type PaymentPayer = User | Provider;

export interface PaymentFulfilment {
  fulfilled: boolean;
  after: () => Promise<void>;
}

const UNFULFILLED: PaymentFulfilment = {
  fulfilled: false,
  after: () => Promise.resolve(),
};

import { AdminNotificationService } from '../notification/admin-notification.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import { notificationTexts } from '../notification/notification-texts';
import { NotificationType } from '../notification/enums/notification-type.enum';
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
    private readonly settingService: SettingService,
    @Optional()
    private readonly adminNotifications?: AdminNotificationService,
    @Optional()
    private readonly notifications?: NotificationService,
    @Optional()
    private readonly searchService?: SearchService,
  ) {}

  async settleContractPayment(
    contractId: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<ContractPaymentResponse> {
    this.assertMockShortcut(language);
    if (principal.type !== 'user') {
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
            amount: Number(contract.totalPayable),
            commissionPercent: Number(contract.commissionPercent),
            commissionAmount: Number(contract.commissionAmount),
            vatRate: Number(contract.vatRate),
            vatAmount: Number(contract.vatAmount),
            paymentMethod: PaymentMethod.MOCK,
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
            gateway: 'MOCK',
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
        amount: Number(contract.totalPayable),
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
        paidAt: new Date(),
        gateway: 'MOCK',
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
      await this.notifyAdminsOfPayment(result.payment);
      await this.notifyContractPaid(result.contract);
    }
    // Contract rows are locked without joins inside the transaction. Re-read
    // the committed contract with its GraphQL detail relations before returning
    // it, otherwise non-null relation fields such as `signatures` serialize as
    // null even though their records exist.
    const hydratedContract = await this.contractService.findOne(
      contractId,
      principal,
      language,
    );
    return { payment: result.payment, contract: hydratedContract };
  }

  async settleConversationFee(
    conversationId: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<ConversationFeePaymentResponse> {
    this.assertMockShortcut(language);
    const result = await this.dataSource.transaction(async (manager) => {
      const conversation = await manager.getRepository(Conversation).findOne({
        where: { id: conversationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!conversation) {
        throw this.notFound('CONVERSATION_NOT_FOUND', language);
      }
      const isProvider = principal.type === 'provider';
      if (principal.type !== 'provider' && principal.type !== 'user') {
        throw this.unauthorized(language);
      }
      const isParticipant = isProvider
        ? conversation.providerId === principal.sub
        : conversation.userId === principal.sub;
      if (!isParticipant) {
        throw this.unauthorized(language);
      }
      if (conversation.status !== ConversationStatus.ACTIVE) {
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
        `${conversation.id}:${conversation.feeCycle}`,
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
            expiresAt: conversation.expiresAt,
            feeCycle: conversation.feeCycle,
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
            configSnapshot: {
              enabled,
              amount,
              feeCycle: conversation.feeCycle,
            },
            paymentMethod: PaymentMethod.MOCK,
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
            gateway: 'MOCK',
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
          configSnapshot: {
            enabled,
            amount,
            feeCycle: conversation.feeCycle,
          },
          paymentMethod: PaymentMethod.MOCK,
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          gateway: 'MOCK',
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
          expiresAt: savedConversation.expiresAt,
          feeCycle: savedConversation.feeCycle,
        },
        event,
      };
    });
    if (result.event) {
      await this.publishSafely(result.event);
      await this.notifyAdminsOfPayment(result.payment);
      await this.notifyChatFeePaid(result.conversation, principal);
    }
    return {
      payment: result.payment,
      conversation: result.conversation,
      access: result.access,
    };
  }

  /**
   * S4-10: delivers what a gateway-confirmed payment bought, inside the
   * caller's transaction. `fulfilled: false` means the target can no longer
   * take the money (e.g. the contract expired meanwhile); admins then refund
   * it (S4-13). `after` runs the notifications once the transaction commits.
   */
  async fulfil(
    payment: Payment,
    manager: EntityManager,
    language: LanguageCode = 'en',
  ): Promise<PaymentFulfilment> {
    switch (payment.purpose) {
      case PaymentPurpose.CONTRACT:
        return this.fulfilContract(payment, manager, language);
      case PaymentPurpose.CHAT_CUSTOMER:
      case PaymentPurpose.CHAT_PROVIDER:
        return this.fulfilChatFee(payment, manager);
      case PaymentPurpose.PREMIUM_AD:
        return this.fulfilPremiumAd(payment, manager);
    }
  }

  private async fulfilContract(
    payment: Payment,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<PaymentFulfilment> {
    const contract = payment.contractId
      ? await manager.getRepository(Contract).findOne({
          where: { id: payment.contractId },
          lock: { mode: 'pessimistic_write' },
        })
      : null;
    if (!contract || contract.status !== ContractStatus.ACCEPTED) {
      return UNFULFILLED;
    }
    let paid: Contract;
    try {
      paid = await this.contractService.transitionAfterPayment(
        contract.id,
        manager,
        language,
      );
    } catch (error) {
      // A newer version superseded it: nothing to pay any more.
      this.logger.warn(
        `Paid contract ${contract.id} could not start: ${String(error)}`,
      );
      return UNFULFILLED;
    }
    const event = await this.messageService.persistSystemEvent(
      contract.conversationId,
      MessageKind.CONTRACT_PAID,
      {
        contractId: contract.id,
        paymentId: payment.id,
        amount: Number(payment.amount),
      },
      manager,
    );
    return {
      fulfilled: true,
      after: async () => {
        await this.publishSafely(event);
        await this.notifyAdminsOfPayment(payment);
        await this.notifyContractPaid(paid);
      },
    };
  }

  private async fulfilChatFee(
    payment: Payment,
    manager: EntityManager,
  ): Promise<PaymentFulfilment> {
    const repository = manager.getRepository(Conversation);
    const conversation = payment.conversationId
      ? await repository.findOne({
          where: { id: payment.conversationId },
          lock: { mode: 'pessimistic_write' },
        })
      : null;
    const cycle = Number(payment.configSnapshot?.feeCycle);
    if (
      !conversation ||
      conversation.status !== ConversationStatus.ACTIVE ||
      conversation.feeCycle !== cycle
    ) {
      return UNFULFILLED;
    }
    const isProvider = payment.payerType === PayerType.PROVIDER;
    const field = isProvider ? 'providerFeePaidAt' : 'customerFeePaidAt';
    if (conversation[field]) return UNFULFILLED;
    conversation[field] = new Date();
    const saved = await repository.save(conversation);
    const event = await this.messageService.persistSystemEvent(
      conversation.id,
      MessageKind.CHAT_FEE_PAID,
      {
        paymentId: payment.id,
        payerType: payment.payerType,
        amount: Number(payment.amount),
      },
      manager,
    );
    return {
      fulfilled: true,
      after: async () => {
        await this.publishSafely(event);
        await this.notifyAdminsOfPayment(payment);
        await this.notifyChatFeePaid(saved, {
          sub: payment.payerId,
          type: isProvider ? 'provider' : 'user',
        } as JwtPayload);
      },
    };
  }

  private async fulfilPremiumAd(
    payment: Payment,
    manager: EntityManager,
  ): Promise<PaymentFulfilment> {
    const repository = manager.getRepository(Listing);
    const listing = payment.listingId
      ? await repository.findOne({
          where: { id: payment.listingId },
          lock: { mode: 'pessimistic_write' },
        })
      : null;
    const cycle = Number(payment.configSnapshot?.promotionCycle);
    const durationDays = Number(payment.configSnapshot?.durationDays);
    if (
      !listing ||
      listing.promotionStatus !== PromotionStatus.PENDING_PAYMENT ||
      listing.promotionCycle + 1 !== cycle ||
      !(durationDays >= 1)
    ) {
      return UNFULFILLED;
    }
    const now = new Date();
    Object.assign(listing, {
      type: ListingType.FEATURED,
      promotionStatus: PromotionStatus.ACTIVE,
      promotionCycle: cycle,
      featuredStartsAt: now,
      featuredEndsAt: new Date(now.getTime() + durationDays * 86_400_000),
    });
    const saved = await repository.save(listing);
    return {
      fulfilled: true,
      after: async () => {
        void this.searchService?.indexListing(saved).catch(() => undefined);
        await this.notifyAdminsOfPayment(payment);
        await this.notifications?.notifyLocalized({
          recipientId: saved.providerId,
          recipientType: NotificationRecipientType.PROVIDER,
          type: NotificationType.LISTING_FEATURED,
          text: notificationTexts.listingFeatured(saved.name),
          relatedEntityId: saved.id,
          relatedEntityType: 'listing',
        });
      },
    };
  }

  /** The pre-gateway instant shortcuts serve the demo seed and tests only. */
  private assertMockShortcut(language: LanguageCode): void {
    if (paymentGatewayConfig.isMock) return;
    const message = I18nService.translate(
      PAYMENT_ERROR_MESSAGES[PAYMENT_ERROR_CODES.GATEWAY_NOT_MOCK],
      language,
    );
    throw new I18nBadRequestException({ en: message, ar: message }, language);
  }

  /** S4-38: both parties learn the contract is paid and in progress. */
  private async notifyContractPaid(
    contract: Pick<Contract, 'id' | 'publicId' | 'clientId' | 'providerId'>,
  ): Promise<void> {
    if (!this.notifications) return;
    const reference = contract.publicId ?? contract.id;
    await this.notifications.notifyLocalized({
      recipientId: contract.clientId,
      recipientType: NotificationRecipientType.USER,
      type: NotificationType.PAYMENT_RECEIVED,
      text: notificationTexts.contractPaidCustomer(reference),
      relatedEntityId: contract.id,
      relatedEntityType: 'contract',
    });
    await this.notifications.notifyLocalized({
      recipientId: contract.providerId,
      recipientType: NotificationRecipientType.PROVIDER,
      type: NotificationType.PAYMENT_RECEIVED,
      text: notificationTexts.contractPaidProvider(reference),
      relatedEntityId: contract.id,
      relatedEntityType: 'contract',
    });
  }

  private async notifyChatFeePaid(
    conversation: Pick<Conversation, 'id' | 'listingId'>,
    payer: JwtPayload,
  ): Promise<void> {
    if (!this.notifications) return;
    const listing = await this.dataSource.getRepository(Listing).findOne({
      where: { id: conversation.listingId },
      select: { id: true, name: true },
    });
    await this.notifications.notifyLocalized({
      recipientId: payer.sub,
      recipientType:
        payer.type === 'provider'
          ? NotificationRecipientType.PROVIDER
          : NotificationRecipientType.USER,
      type: NotificationType.CHAT_FEE_PAID,
      text: notificationTexts.chatFeePaid(listing?.name ?? ''),
      relatedEntityId: conversation.id,
      relatedEntityType: 'conversation',
    });
  }

  /** BRD 4.3.25: admins see every successful fee or contract payment. */
  async notifyAdminsOfPayment(payment: Payment | null): Promise<void> {
    if (!payment || !this.adminNotifications) return;
    const labels: Record<string, { ar: string; en: string }> = {
      [PaymentPurpose.PREMIUM_AD]: {
        ar: 'رسوم إعلان مميز',
        en: 'featured-ad fee',
      },
      [PaymentPurpose.CONTRACT]: { ar: 'دفع تعاقد', en: 'contract payment' },
    };
    const label = labels[payment.purpose] ?? {
      ar: 'رسوم محادثة',
      en: 'chat fee',
    };
    const amount = Number(payment.amount).toFixed(2);
    await this.adminNotifications.notifyAdmins({
      type: NotificationType.ADMIN_PAYMENT,
      ar: {
        title: 'عملية دفع ناجحة',
        message: `تم استلام ${label.ar} بقيمة ${amount} ر.س`,
      },
      en: {
        title: 'Successful payment',
        message: `Received a ${label.en} of SAR ${amount}`,
      },
      relatedEntityType: payment.contractId ? 'contract' : 'payment',
      relatedEntityId: payment.contractId ?? payment.id,
    });
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

  private badRequest(
    code:
      | 'PREMIUM_AD_DISABLED'
      | 'PROVIDER_NOT_ACTIVE'
      | 'ACTIVE_CONTRACT_REQUIRED',
    language: LanguageCode,
  ): I18nBadRequestException {
    const message = I18nService.translate(
      PAYMENT_ERROR_MESSAGES[PAYMENT_ERROR_CODES[code]],
      language,
    );
    return new I18nBadRequestException({ en: message, ar: message }, language);
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
