import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateContractInput } from './dto/create-contract.input';
import { ContractPaginationInput } from './dto/contract-pagination.input';
import { ContractQuoteInput } from './dto/contract-quote.input';
import { ContractQuote } from './dto/contract-quote.response';
import { AcceptContractInput } from './dto/accept-contract.input';
import { RejectContractInput } from './dto/reject-contract.input';
import { ResendContractInput } from './dto/resend-contract.input';
import { Contract } from './entities/contract.entity';
import { ContractSignature } from './entities/contract-signature.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Category } from '../category/entities/category.entity';
import { DeliveryCompany } from '../delivery-company/entities/delivery-company.entity';
import { DeliveryCompanyStatus } from '../delivery-company/enums/delivery-company-status.enum';
import { ContractStatus } from './enums/contract-status.enum';
import { ContractSignerType } from './enums/contract-signer-type.enum';
import { ContractSignatureType } from './enums/contract-signature-type.enum';
import { CONTRACT_ERROR_MESSAGES } from './errors/contract.error-messages';
import { CONTRACT_ERROR_CODES } from './errors/contract.error-codes';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SettingService } from '../setting/setting.service';
import {
  MessageAddedPayload,
  MessageService,
} from '../conversation/message.service';
import { MessageKind } from '../conversation/enums/message-kind.enum';

const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.PENDING]: [ContractStatus.ACCEPTED, ContractStatus.REJECTED],
  [ContractStatus.ACCEPTED]: [ContractStatus.IN_PROGRESS],
  [ContractStatus.REJECTED]: [],
  [ContractStatus.IN_PROGRESS]: [],
  [ContractStatus.COMPLETED]: [],
  [ContractStatus.CANCELLED]: [],
};

interface ContractSnapshot extends ContractQuote {
  listingId: string;
  categoryId: string;
  provider: Provider;
  deliveryCompanyId: string | null;
  deliveryCompanyNameEn: string | null;
  deliveryCompanyNameAr: string | null;
  categoryRulesEn: string;
  categoryRulesAr: string;
}

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    private readonly dataSource: DataSource,
    private readonly settingService: SettingService,
    private readonly messageService: MessageService,
  ) {}

  private error(
    code: keyof typeof CONTRACT_ERROR_CODES,
    language: LanguageCode,
  ): I18nBadRequestException {
    const message = I18nService.translate(
      CONTRACT_ERROR_MESSAGES[CONTRACT_ERROR_CODES[code]],
      language,
    );
    return new I18nBadRequestException({ en: message, ar: message }, language);
  }

  private unauthorized(language: LanguageCode): I18nBadRequestException {
    return this.error('UNAUTHORIZED_ACCESS', language);
  }

  private assertParticipant(
    contract: Contract,
    principal: JwtPayload,
    language: LanguageCode,
  ): void {
    const isClient =
      principal.type === 'user' && principal.sub === contract.clientId;
    const isProvider =
      principal.type === 'provider' && principal.sub === contract.providerId;
    if (!isClient && !isProvider) {
      throw this.unauthorized(language);
    }
  }

  private assertTransition(
    from: ContractStatus,
    to: ContractStatus,
    language: LanguageCode,
  ): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw this.error('INVALID_STATUS_TRANSITION', language);
    }
  }

  async quote(
    input: ContractQuoteInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<ContractQuote> {
    if (principal.type !== 'user') {
      throw this.unauthorized(language);
    }
    const conversation = await this.loadConversation(
      input.conversationId,
      this.dataSource.manager,
      language,
    );
    if (conversation.userId !== principal.sub) {
      throw this.unauthorized(language);
    }
    const snapshot = await this.buildSnapshot(
      conversation,
      input.agreedPrice,
      undefined,
      this.dataSource.manager,
      language,
    );
    return this.toQuote(snapshot);
  }

  async create(
    input: CreateContractInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    if (principal.type !== 'user') {
      throw this.unauthorized(language);
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const conversation = await this.loadConversation(
        input.conversationId,
        manager,
        language,
      );
      if (conversation.userId !== principal.sub) {
        throw this.unauthorized(language);
      }
      const existing = await manager.getRepository(Contract).count({
        where: { conversationId: conversation.id },
      });
      if (existing > 0) {
        throw this.error('DUPLICATE_CONTRACT', language);
      }

      const snapshot = await this.buildSnapshot(
        conversation,
        input.agreedPrice,
        input.deliveryCompanyId,
        manager,
        language,
      );
      const contract = manager.getRepository(Contract).create({
        ...this.contractValues(snapshot, conversation, input),
        version: 1,
        pricingVersion: 2,
        supersedesContractId: null,
        status: ContractStatus.PENDING,
      });
      const saved = await manager.getRepository(Contract).save(contract);
      const signature = await this.addSignature(
        saved.id,
        principal.sub,
        ContractSignerType.USER,
        ContractSignatureType.CUSTOMER_ACCEPTANCE,
        input.signatureData,
        manager,
        language,
      );
      saved.signatures = [signature];
      const event = await this.messageService.persistSystemEvent(
        conversation.id,
        MessageKind.CONTRACT_CREATED,
        { contractId: saved.id, version: saved.version },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    return result.contract;
  }

  async resendContract(
    input: ResendContractInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    if (principal.type !== 'user') {
      throw this.unauthorized(language);
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const rejected = await this.loadLocked(
        input.rejectedContractId,
        manager,
        language,
      );
      if (rejected.clientId !== principal.sub) {
        throw this.unauthorized(language);
      }
      if (rejected.status !== ContractStatus.REJECTED) {
        throw this.error('INVALID_STATUS_TRANSITION', language);
      }
      await this.assertLatest(rejected, manager, language);
      const conversation = await this.loadConversation(
        rejected.conversationId,
        manager,
        language,
      );
      const snapshot = await this.buildSnapshot(
        conversation,
        input.agreedPrice,
        input.deliveryCompanyId,
        manager,
        language,
      );
      const contract = manager.getRepository(Contract).create({
        ...this.contractValues(snapshot, conversation, input),
        version: rejected.version + 1,
        pricingVersion: 2,
        supersedesContractId: rejected.id,
        status: ContractStatus.PENDING,
      });
      const saved = await manager.getRepository(Contract).save(contract);
      const signature = await this.addSignature(
        saved.id,
        principal.sub,
        ContractSignerType.USER,
        ContractSignatureType.CUSTOMER_ACCEPTANCE,
        input.signatureData,
        manager,
        language,
      );
      saved.signatures = [signature];
      const event = await this.messageService.persistSystemEvent(
        conversation.id,
        MessageKind.CONTRACT_RESENT,
        {
          contractId: saved.id,
          version: saved.version,
          supersedesContractId: rejected.id,
        },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    return result.contract;
  }

  async acceptContract(
    input: AcceptContractInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const result = await this.dataSource.transaction(async (manager) => {
      const contract = await this.loadLocked(
        input.contractId,
        manager,
        language,
      );
      if (
        principal.type !== 'provider' ||
        principal.sub !== contract.providerId
      ) {
        throw this.unauthorized(language);
      }
      await this.assertLatest(contract, manager, language);
      this.assertTransition(contract.status, ContractStatus.ACCEPTED, language);
      if (
        contract.maxCompletionDays != null &&
        input.deliveryTimeDays > contract.maxCompletionDays
      ) {
        throw this.error('INVALID_DELIVERY_TIME', language);
      }
      const signature = await this.addSignature(
        contract.id,
        principal.sub,
        ContractSignerType.PROVIDER,
        ContractSignatureType.PROVIDER_ACCEPTANCE,
        input.signatureData,
        manager,
        language,
      );
      contract.deliveryTimeDays = input.deliveryTimeDays;
      contract.status = ContractStatus.ACCEPTED;
      contract.acceptedAt = new Date();
      const saved = await manager.getRepository(Contract).save(contract);
      saved.signatures = [...(saved.signatures ?? []), signature];
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        MessageKind.CONTRACT_ACCEPTED,
        { contractId: contract.id, version: contract.version },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    return result.contract;
  }

  async rejectContract(
    input: RejectContractInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const rejectionReason = input.reason.trim();
    if (!rejectionReason) {
      throw this.error('REJECTION_REASON_REQUIRED', language);
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const contract = await this.loadLocked(
        input.contractId,
        manager,
        language,
      );
      if (
        principal.type !== 'provider' ||
        principal.sub !== contract.providerId
      ) {
        throw this.unauthorized(language);
      }
      await this.assertLatest(contract, manager, language);
      this.assertTransition(contract.status, ContractStatus.REJECTED, language);
      contract.status = ContractStatus.REJECTED;
      contract.rejectionReason = rejectionReason;
      contract.rejectedAt = new Date();
      const saved = await manager.getRepository(Contract).save(contract);
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        MessageKind.CONTRACT_REJECTED,
        {
          contractId: contract.id,
          version: contract.version,
          reason: contract.rejectionReason,
        },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    return result.contract;
  }

  async findAll(
    input: ContractPaginationInput,
    principal?: JwtPayload,
  ): Promise<IPaginatedType<Contract>> {
    const {
      page = 1,
      limit = 10,
      conversationId,
      status,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = input;
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.conversation', 'conversation')
      .leftJoinAndSelect('contract.client', 'client')
      .leftJoinAndSelect('contract.provider', 'provider')
      .leftJoinAndSelect('contract.signatures', 'signatures');
    if (principal) {
      query.andWhere(
        principal.type === 'provider'
          ? 'contract.providerId = :principalId'
          : 'contract.clientId = :principalId',
        { principalId: principal.sub },
      );
    }
    if (conversationId) {
      query.andWhere('contract.conversationId = :conversationId', {
        conversationId,
      });
    }
    if (status) {
      query.andWhere('contract.status = :status', { status });
    }
    const [items, total] = await query
      .orderBy(
        sortBy ? `contract.${sortBy}` : 'contract.createdAt',
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
  ): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: [
        'conversation',
        'client',
        'provider',
        'signatures',
        'supersedesContract',
      ],
    });
    if (!contract) {
      throw this.notFound(language);
    }
    this.assertParticipant(contract, principal, language);
    return contract;
  }

  async findOneAdmin(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: [
        'conversation',
        'client',
        'provider',
        'signatures',
        'supersedesContract',
      ],
    });
    if (!contract) throw this.notFound(language);
    return contract;
  }

  async transitionAfterPayment(
    contractId: string,
    manager: EntityManager,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const contract = await this.loadLocked(contractId, manager, language);
    await this.assertLatest(contract, manager, language);
    this.assertTransition(
      contract.status,
      ContractStatus.IN_PROGRESS,
      language,
    );
    contract.status = ContractStatus.IN_PROGRESS;
    return manager.getRepository(Contract).save(contract);
  }

  private async loadConversation(
    id: string,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<Conversation> {
    const conversation = await manager.getRepository(Conversation).findOne({
      where: { id },
      relations: ['listing', 'provider'],
    });
    if (!conversation) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES[CONTRACT_ERROR_CODES.CONVERSATION_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }
    return conversation;
  }

  private async loadLocked(
    id: string,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<Contract> {
    const contract = await manager.getRepository(Contract).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!contract) {
      throw this.notFound(language);
    }
    return contract;
  }

  private notFound(language: LanguageCode): I18nNotFoundException {
    const message = I18nService.translate(
      CONTRACT_ERROR_MESSAGES[CONTRACT_ERROR_CODES.CONTRACT_NOT_FOUND],
      language,
    );
    return new I18nNotFoundException({ en: message, ar: message }, language);
  }

  private async assertLatest(
    contract: Contract,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<void> {
    const latest = await manager.getRepository(Contract).findOne({
      where: { conversationId: contract.conversationId },
      order: { version: 'DESC' },
    });
    if (!latest || latest.id !== contract.id) {
      throw this.error('CONTRACT_NOT_LATEST', language);
    }
  }

  private async buildSnapshot(
    conversation: Conversation,
    agreedPrice: number,
    deliveryCompanyId: string | undefined,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<ContractSnapshot> {
    const listing =
      conversation.listing ??
      (await manager.getRepository(Listing).findOne({
        where: { id: conversation.listingId },
      }));
    if (!listing) {
      throw this.error('CATEGORY_NOT_FOUND', language);
    }
    const category = await manager.getRepository(Category).findOne({
      where: { id: listing.categoryId },
    });
    if (!category) {
      throw this.error('CATEGORY_NOT_FOUND', language);
    }
    let deliveryCompany: DeliveryCompany | null = null;
    if (deliveryCompanyId) {
      deliveryCompany = await manager
        .getRepository(DeliveryCompany)
        .findOne({ where: { id: deliveryCompanyId } });
      if (
        !deliveryCompany ||
        deliveryCompany.status !== DeliveryCompanyStatus.ACTIVE
      ) {
        throw this.error('DELIVERY_COMPANY_NOT_FOUND', language);
      }
    }
    const provider =
      conversation.provider ??
      (await manager.getRepository(Provider).findOne({
        where: { id: conversation.providerId },
      }));
    if (!provider) {
      throw this.error('PROVIDER_NOT_FOUND', language);
    }
    const setting = await this.settingService.getSetting();
    const price = Number(agreedPrice);
    const depositPercent = category.depositEnabled
      ? Number(category.depositPercent ?? 0)
      : 0;
    const commissionPercent = category.commissionEnabled
      ? Number(category.commissionPercent ?? 0)
      : 0;
    const threshold = category.minCommissionEnabled
      ? Number(category.minCommissionAmount ?? 0)
      : 0;
    const commissionApplies = threshold <= 0 || price >= threshold;
    const commissionAmount = commissionApplies
      ? this.round(price * (commissionPercent / 100))
      : 0;
    const vatRate = setting.vatEnabled ? Number(setting.vatRate ?? 0) : 0;
    const vatAmount = this.round(price * (vatRate / 100));
    return {
      listingId: listing.id,
      categoryId: category.id,
      provider,
      deliveryCompanyId: deliveryCompanyId ?? null,
      deliveryCompanyNameEn: deliveryCompany?.nameEn ?? null,
      deliveryCompanyNameAr: deliveryCompany?.nameAr ?? null,
      categoryRulesEn: category.rulesEn ?? '',
      categoryRulesAr: category.rulesAr ?? '',
      agreedPrice: price,
      depositPercent,
      downPayment: this.round(price * (depositPercent / 100)),
      commissionPercent,
      commissionAmount,
      vatRate,
      vatAmount,
      totalPayable: this.round(price + vatAmount),
      providerNetAmount: this.round(price - commissionAmount),
      contractDocumentText: category.contractDocumentEnabled
        ? category.contractDocumentText
        : '',
      maxCompletionDays: category.maxCompletionDaysEnabled
        ? category.maxCompletionDays
        : null,
      maxTerminationDays: category.maxTerminationDaysEnabled
        ? category.maxTerminationDays
        : null,
    };
  }

  private contractValues(
    snapshot: ContractSnapshot,
    conversation: Conversation,
    input: CreateContractInput | ResendContractInput,
  ): Partial<Contract> {
    return {
      conversationId: conversation.id,
      listingId: snapshot.listingId,
      categoryId: snapshot.categoryId,
      clientId: conversation.userId,
      providerId: conversation.providerId,
      agreedPrice: snapshot.agreedPrice,
      depositPercent: snapshot.depositPercent,
      downPayment: snapshot.downPayment,
      commissionPercent: snapshot.commissionPercent,
      commissionAmount: snapshot.commissionAmount,
      vatRate: snapshot.vatRate,
      vatAmount: snapshot.vatAmount,
      totalPayable: snapshot.totalPayable,
      providerNetAmount: snapshot.providerNetAmount,
      customerAddress: input.customerAddress.trim(),
      customerLatitude: input.customerLatitude ?? null,
      customerLongitude: input.customerLongitude ?? null,
      providerAddress: snapshot.provider.address ?? null,
      providerLatitude: snapshot.provider.latitude ?? null,
      providerLongitude: snapshot.provider.longitude ?? null,
      deliveryCompanyId: snapshot.deliveryCompanyId,
      deliveryCompanyNameEn: snapshot.deliveryCompanyNameEn,
      deliveryCompanyNameAr: snapshot.deliveryCompanyNameAr,
      categoryRulesEn: snapshot.categoryRulesEn,
      categoryRulesAr: snapshot.categoryRulesAr,
      contractDocumentText: snapshot.contractDocumentText,
      maxCompletionDays: snapshot.maxCompletionDays,
      maxTerminationDays: snapshot.maxTerminationDays,
      deliveryTimeDays: null,
      rejectionReason: null,
      acceptedAt: null,
      rejectedAt: null,
    };
  }

  private toQuote(snapshot: ContractSnapshot): ContractQuote {
    return {
      agreedPrice: snapshot.agreedPrice,
      depositPercent: snapshot.depositPercent,
      downPayment: snapshot.downPayment,
      commissionPercent: snapshot.commissionPercent,
      commissionAmount: snapshot.commissionAmount,
      vatRate: snapshot.vatRate,
      vatAmount: snapshot.vatAmount,
      totalPayable: snapshot.totalPayable,
      providerNetAmount: snapshot.providerNetAmount,
      contractDocumentText: snapshot.contractDocumentText,
      maxCompletionDays: snapshot.maxCompletionDays,
      maxTerminationDays: snapshot.maxTerminationDays,
    };
  }

  private async addSignature(
    contractId: string,
    signerId: string,
    signerType: ContractSignerType,
    signatureType: ContractSignatureType,
    signatureData: string,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<ContractSignature> {
    const repository = manager.getRepository(ContractSignature);
    const existing = await repository.findOne({
      where: { contractId, signatureType },
    });
    if (existing) {
      throw this.error('SIGNATURE_ALREADY_EXISTS', language);
    }
    return repository.save(
      repository.create({
        contractId,
        signerId,
        signerType,
        signatureType,
        signatureData,
      }),
    );
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }

  private async publishSafely(payload: MessageAddedPayload): Promise<void> {
    try {
      await this.messageService.publish(payload);
    } catch (error) {
      this.logger.warn(
        `Contract event persisted but realtime publish failed: ${String(error)}`,
      );
    }
  }
}
