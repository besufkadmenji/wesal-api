import { Injectable, Logger, Optional } from '@nestjs/common';
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
import { InitializeContractInput } from './dto/initialize-contract.input';
import { ContractPaginationInput } from './dto/contract-pagination.input';
import { ContractQuoteInput } from './dto/contract-quote.input';
import { ContractQuote } from './dto/contract-quote.response';
import { AcceptContractInput } from './dto/accept-contract.input';
import { CompleteContractInput } from './dto/complete-contract.input';
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
import { ProviderCompleteContractInput } from './dto/provider-complete-contract.input';
import { CancelContractInput } from './dto/cancel-contract.input';
import { RefuseDeliveryInput } from './dto/refuse-delivery.input';
import {
  AdminResolveContractInput,
  ContractResolution,
} from './dto/admin-resolve-contract.input';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { ContractAudit } from './entities/contract-audit.entity';
import { ContractSettlement } from './entities/contract-settlement.entity';
import { ContractActorType } from './enums/contract-actor-type.enum';
import { ContractAuditAction } from './enums/contract-audit-action.enum';
import { ContractSettlementType } from './enums/contract-settlement-type.enum';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentPurpose } from '../payment/enums/payment-purpose.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { NotificationService } from '../notification/notification.service';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import { NotificationType } from '../notification/enums/notification-type.enum';

const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.DRAFT]: [ContractStatus.PENDING],
  [ContractStatus.PENDING]: [ContractStatus.ACCEPTED, ContractStatus.REJECTED],
  [ContractStatus.ACCEPTED]: [ContractStatus.IN_PROGRESS],
  [ContractStatus.REJECTED]: [],
  [ContractStatus.IN_PROGRESS]: [
    ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
    ContractStatus.DELIVERY_IN_PROGRESS,
    ContractStatus.CANCELLATION_REQUESTED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.AWAITING_CUSTOMER_CONFIRMATION]: [
    ContractStatus.COMPLETED,
    ContractStatus.CANCELLATION_REQUESTED,
    ContractStatus.DISPUTED,
  ],
  [ContractStatus.DELIVERY_IN_PROGRESS]: [
    ContractStatus.COMPLETED,
    ContractStatus.CANCELLATION_REQUESTED,
    ContractStatus.DISPUTED,
  ],
  [ContractStatus.CANCELLATION_REQUESTED]: [
    ContractStatus.CANCELLED,
    ContractStatus.DISPUTED,
  ],
  [ContractStatus.DISPUTED]: [
    ContractStatus.COMPLETED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.COMPLETED]: [],
  [ContractStatus.CANCELLED]: [],
};

const CONTRACT_DETAIL_RELATIONS = [
  'conversation',
  'conversation.listing',
  'conversation.listing.category',
  'conversation.listing.provider',
  'client',
  'provider',
  'signatures',
  'supersedesContract',
  'settlements',
  'audits',
  'document',
];

interface ContractSnapshot extends ContractQuote {
  listingId: string;
  categoryId: string;
  provider: Provider;
  deliveryCompanyId: string | null;
  deliveryCompanyNameEn: string | null;
  deliveryCompanyNameAr: string | null;
  categoryRulesEn: string;
  categoryRulesAr: string;
  undertakingTextAr: string;
  undertakingTextEn: string;
  refundPolicyAr: string;
  refundPolicyEn: string;
}

interface ContractDetailsInput {
  customerAddress: string;
  customerLatitude?: number;
  customerLongitude?: number;
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
    @Optional()
    private readonly notificationService?: NotificationService,
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

  async initialize(
    input: InitializeContractInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    if (principal.type !== 'user') {
      throw this.unauthorized(language);
    }

    return this.dataSource.transaction(async (manager) => {
      // Locking the conversation serializes refreshes, retries, and multiple
      // browser tabs before any contract row exists.
      const conversation = await this.loadConversation(
        input.conversationId,
        manager,
        language,
        true,
      );
      if (conversation.userId !== principal.sub) {
        throw this.unauthorized(language);
      }

      const repository = manager.getRepository(Contract);
      const existing = await repository.findOne({
        where: { conversationId: conversation.id },
        order: { version: 'DESC' },
      });
      if (existing) {
        if (existing.status === ContractStatus.DRAFT) {
          return existing;
        }
        throw this.error('DUPLICATE_CONTRACT', language);
      }

      const snapshot = await this.buildSnapshot(
        conversation,
        0,
        undefined,
        manager,
        language,
      );
      return repository.save(
        repository.create({
          ...this.contractValues(snapshot, conversation, {
            customerAddress: '',
          }),
          version: 1,
          pricingVersion: 2,
          supersedesContractId: null,
          status: ContractStatus.DRAFT,
        }),
      );
    });
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
        true,
      );
      if (conversation.userId !== principal.sub) {
        throw this.unauthorized(language);
      }
      const repository = manager.getRepository(Contract);
      const existing = await repository.findOne({
        where: { conversationId: conversation.id },
        order: { version: 'DESC' },
      });
      if (input.contractId && existing?.id !== input.contractId) {
        throw this.notFound(language);
      }
      if (
        existing?.status === ContractStatus.PENDING &&
        input.contractId === existing.id
      ) {
        return { contract: existing, event: null };
      }
      if (existing && existing.status !== ContractStatus.DRAFT) {
        throw this.error('DUPLICATE_CONTRACT', language);
      }

      const snapshot = await this.buildSnapshot(
        conversation,
        input.agreedPrice,
        input.deliveryCompanyId,
        manager,
        language,
      );
      const signatureData = await this.resolveCustomerSignature(
        principal.sub,
        input.signatureData,
        manager,
        language,
      );
      const contract = existing
        ? repository.merge(
            existing,
            this.contractValues(snapshot, conversation, input),
            { status: ContractStatus.PENDING },
          )
        : repository.create({
            ...this.contractValues(snapshot, conversation, input),
            version: 1,
            pricingVersion: 2,
            supersedesContractId: null,
            status: ContractStatus.PENDING,
          });
      const saved = await repository.save(contract);
      const signature = await this.addSignature(
        saved.id,
        principal.sub,
        ContractSignerType.USER,
        ContractSignatureType.CUSTOMER_ACCEPTANCE,
        signatureData,
        manager,
        language,
      );
      saved.signatures = [signature];
      await this.recordAudit(
        manager,
        saved,
        principal.sub,
        ContractActorType.USER,
        ContractAuditAction.CONTRACT_CREATED,
        ContractStatus.DRAFT,
        ContractStatus.PENDING,
      );
      const event = await this.messageService.persistSystemEvent(
        conversation.id,
        MessageKind.CONTRACT_CREATED,
        { contractId: saved.id, version: saved.version },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    await this.notifyContract(
      result.contract.providerId,
      NotificationRecipientType.PROVIDER,
      result.contract,
      language,
    );
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
      const retry = await manager.getRepository(Contract).findOne({
        where: { supersedesContractId: rejected.id },
      });
      if (retry) return { contract: retry, event: null };
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
      const signatureData = await this.resolveCustomerSignature(
        principal.sub,
        input.signatureData,
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
        signatureData,
        manager,
        language,
      );
      saved.signatures = [signature];
      await this.recordAudit(
        manager,
        saved,
        principal.sub,
        ContractActorType.USER,
        ContractAuditAction.CONTRACT_RESENT,
        ContractStatus.REJECTED,
        ContractStatus.PENDING,
        null,
        { supersedesContractId: rejected.id },
      );
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
    await this.notifyContract(
      result.contract.providerId,
      NotificationRecipientType.PROVIDER,
      result.contract,
      language,
    );
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
      if (contract.status === ContractStatus.ACCEPTED) {
        return { contract, event: null };
      }
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
      await this.recordAudit(
        manager,
        saved,
        principal.sub,
        ContractActorType.PROVIDER,
        ContractAuditAction.CONTRACT_ACCEPTED,
        ContractStatus.PENDING,
        ContractStatus.ACCEPTED,
      );
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        MessageKind.CONTRACT_ACCEPTED,
        { contractId: contract.id, version: contract.version },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    await this.notifyContract(
      result.contract.clientId,
      NotificationRecipientType.USER,
      result.contract,
      language,
    );
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
      if (
        contract.status === ContractStatus.REJECTED &&
        contract.rejectionReason === rejectionReason
      ) {
        return { contract, event: null };
      }
      this.assertTransition(contract.status, ContractStatus.REJECTED, language);
      contract.status = ContractStatus.REJECTED;
      contract.rejectionReason = rejectionReason;
      contract.rejectedAt = new Date();
      const saved = await manager.getRepository(Contract).save(contract);
      await this.recordAudit(
        manager,
        saved,
        principal.sub,
        ContractActorType.PROVIDER,
        ContractAuditAction.CONTRACT_REJECTED,
        ContractStatus.PENDING,
        ContractStatus.REJECTED,
        rejectionReason,
      );
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
    await this.notifyContract(
      result.contract.clientId,
      NotificationRecipientType.USER,
      result.contract,
      language,
    );
    return result.contract;
  }

  async completeContract(
    input: CompleteContractInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const result = await this.dataSource.transaction(async (manager) => {
      const contract = await this.loadLocked(
        input.contractId,
        manager,
        language,
      );
      if (principal.type !== 'user' || principal.sub !== contract.clientId) {
        throw this.unauthorized(language);
      }
      await this.assertLatest(contract, manager, language);
      if (contract.status === ContractStatus.COMPLETED) {
        return { contract, event: null };
      }
      if (
        contract.status !== ContractStatus.AWAITING_CUSTOMER_CONFIRMATION &&
        contract.status !== ContractStatus.DELIVERY_IN_PROGRESS
      ) {
        throw this.error('INVALID_STATUS_TRANSITION', language);
      }
      const previousStatus = contract.status;
      const signatureData = await this.resolveCustomerSignature(
        principal.sub,
        undefined,
        manager,
        language,
      );
      const signature = await this.addSignature(
        contract.id,
        principal.sub,
        ContractSignerType.USER,
        ContractSignatureType.CUSTOMER_COMPLETION,
        signatureData,
        manager,
        language,
      );
      contract.status = ContractStatus.COMPLETED;
      contract.completedAt = new Date();
      const saved = await manager.getRepository(Contract).save(contract);
      saved.signatures = [...(saved.signatures ?? []), signature];
      await this.settleCompleted(contract, manager, principal.sub);
      await this.recordAudit(
        manager,
        contract,
        principal.sub,
        ContractActorType.USER,
        ContractAuditAction.CUSTOMER_COMPLETED,
        previousStatus,
        ContractStatus.COMPLETED,
      );
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        MessageKind.CONTRACT_COMPLETED,
        { contractId: contract.id, version: contract.version },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    await this.notifyContract(
      result.contract.providerId,
      NotificationRecipientType.PROVIDER,
      result.contract,
      language,
    );
    return this.findOne(input.contractId, principal, language);
  }

  async providerCompleteContract(
    input: ProviderCompleteContractInput,
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
      if (
        contract.status === ContractStatus.AWAITING_CUSTOMER_CONFIRMATION ||
        contract.status === ContractStatus.DELIVERY_IN_PROGRESS
      ) {
        return { contract, event: null };
      }
      if (contract.status !== ContractStatus.IN_PROGRESS) {
        throw this.error('INVALID_STATUS_TRANSITION', language);
      }
      const signature = await this.addSignature(
        contract.id,
        principal.sub,
        ContractSignerType.PROVIDER,
        ContractSignatureType.PROVIDER_COMPLETION,
        input.signatureData,
        manager,
        language,
      );
      const setting = await this.settingService.getSetting();
      const now = new Date();
      const usesDelivery = Boolean(contract.deliveryCompanyId);
      if (usesDelivery && !input.deliveryEstimateDays) {
        throw new I18nBadRequestException(
          {
            en: 'A delivery estimate is required for this contract',
            ar: 'مدة التوصيل مطلوبة لهذا العقد',
          },
          language,
        );
      }
      contract.providerCompletedAt = now;
      contract.deliveryEstimateDays = input.deliveryEstimateDays ?? null;
      contract.deliveryStartedAt = usesDelivery ? now : null;
      const graceHours = Math.max(
        1,
        Number(setting.completionConfirmationGraceHours ?? 24),
      );
      const deliveryHours = (input.deliveryEstimateDays ?? 0) * 24;
      contract.confirmationDeadlineAt = new Date(
        now.getTime() + (deliveryHours + graceHours) * 3_600_000,
      );
      contract.status = usesDelivery
        ? ContractStatus.DELIVERY_IN_PROGRESS
        : ContractStatus.AWAITING_CUSTOMER_CONFIRMATION;
      const saved = await manager.getRepository(Contract).save(contract);
      saved.signatures = [...(saved.signatures ?? []), signature];
      const action = usesDelivery
        ? ContractAuditAction.DELIVERY_STARTED
        : ContractAuditAction.PROVIDER_COMPLETED;
      await this.recordAudit(
        manager,
        contract,
        principal.sub,
        ContractActorType.PROVIDER,
        action,
        ContractStatus.IN_PROGRESS,
        contract.status,
        null,
        { deliveryEstimateDays: input.deliveryEstimateDays ?? null },
      );
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        usesDelivery
          ? MessageKind.CONTRACT_DELIVERY_STARTED
          : MessageKind.CONTRACT_PROVIDER_COMPLETED,
        {
          contractId: contract.id,
          version: contract.version,
          confirmationDeadlineAt: contract.confirmationDeadlineAt,
        },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    await this.notifyContract(
      result.contract.clientId,
      NotificationRecipientType.USER,
      result.contract,
      language,
    );
    return this.findOne(input.contractId, principal, language);
  }

  async requestCancellation(
    input: CancelContractInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const result = await this.dataSource.transaction(async (manager) => {
      const contract = await this.loadLocked(
        input.contractId,
        manager,
        language,
      );
      if (principal.type !== 'user' || principal.sub !== contract.clientId) {
        throw this.unauthorized(language);
      }
      await this.assertLatest(contract, manager, language);
      const previousStatus = contract.status;
      if (
        (previousStatus === ContractStatus.CANCELLED ||
          previousStatus === ContractStatus.DISPUTED) &&
        contract.cancellationReason === input.reason.trim()
      ) {
        return { contract, event: null };
      }
      if (
        previousStatus !== ContractStatus.DRAFT &&
        previousStatus !== ContractStatus.PENDING &&
        previousStatus !== ContractStatus.ACCEPTED &&
        previousStatus !== ContractStatus.IN_PROGRESS &&
        previousStatus !== ContractStatus.AWAITING_CUSTOMER_CONFIRMATION &&
        previousStatus !== ContractStatus.DELIVERY_IN_PROGRESS
      ) {
        throw this.error('INVALID_STATUS_TRANSITION', language);
      }
      const reason = input.reason.trim();
      contract.cancellationReason = reason;
      contract.cancellationRequestedAt = new Date();
      const early = [
        ContractStatus.DRAFT,
        ContractStatus.PENDING,
        ContractStatus.ACCEPTED,
        ContractStatus.IN_PROGRESS,
      ].includes(previousStatus);
      contract.status = early
        ? ContractStatus.CANCELLED
        : ContractStatus.DISPUTED;
      if (early) {
        contract.cancelledAt = new Date();
        if (previousStatus === ContractStatus.IN_PROGRESS) {
          await this.settleEarlyCancellation(
            contract,
            manager,
            principal.sub,
            reason,
          );
        }
      } else {
        contract.disputeReason = reason;
        contract.disputedAt = new Date();
        await this.holdDispute(contract, manager, principal.sub, reason);
      }
      const saved = await manager.getRepository(Contract).save(contract);
      await this.recordAudit(
        manager,
        contract,
        principal.sub,
        ContractActorType.USER,
        early
          ? ContractAuditAction.CANCELLATION_REQUESTED
          : ContractAuditAction.DELIVERY_REFUSED,
        previousStatus,
        contract.status,
        reason,
      );
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        early ? MessageKind.CONTRACT_CANCELLED : MessageKind.CONTRACT_DISPUTED,
        { contractId: contract.id, reason },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    await this.notifyContract(
      result.contract.providerId,
      NotificationRecipientType.PROVIDER,
      result.contract,
      language,
    );
    return this.findOne(input.contractId, principal, language);
  }

  async refuseDelivery(
    input: RefuseDeliveryInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    return this.requestCancellation(input, principal, language);
  }

  async adminResolveContract(
    input: AdminResolveContractInput,
    admin: AdminJwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const result = await this.dataSource.transaction(async (manager) => {
      const contract = await this.loadLocked(
        input.contractId,
        manager,
        language,
      );
      const complete =
        input.resolution === ContractResolution.RELEASE_PROVIDER ||
        input.resolution === ContractResolution.COMPLETE;
      if (
        (complete && contract.status === ContractStatus.COMPLETED) ||
        (!complete && contract.status === ContractStatus.CANCELLED)
      ) {
        return { contract, event: null };
      }
      const previousStatus = contract.status;
      const isDisputed = previousStatus === ContractStatus.DISPUTED;
      const isConfirmationPending =
        previousStatus === ContractStatus.AWAITING_CUSTOMER_CONFIRMATION ||
        previousStatus === ContractStatus.DELIVERY_IN_PROGRESS;
      const isOverdue =
        isConfirmationPending &&
        contract.confirmationDeadlineAt != null &&
        contract.confirmationDeadlineAt.getTime() <= Date.now();
      if (!isDisputed && !isOverdue) {
        throw this.error('INVALID_STATUS_TRANSITION', language);
      }
      if (isDisputed) {
        if (
          input.resolution !== ContractResolution.RELEASE_PROVIDER &&
          input.resolution !== ContractResolution.REFUND_CUSTOMER
        ) {
          throw this.error('INVALID_STATUS_TRANSITION', language);
        }
      } else if (
        input.resolution !== ContractResolution.COMPLETE &&
        input.resolution !== ContractResolution.CANCEL
      ) {
        throw this.error('INVALID_STATUS_TRANSITION', language);
      }
      contract.status = complete
        ? ContractStatus.COMPLETED
        : ContractStatus.CANCELLED;
      if (complete) {
        contract.completedAt = new Date();
        await this.settleCompleted(contract, manager, admin.sub);
      } else {
        contract.cancelledAt = new Date();
        await this.settleFullRefund(contract, manager, admin.sub, input.reason);
      }
      const saved = await manager.getRepository(Contract).save(contract);
      await this.recordAudit(
        manager,
        contract,
        admin.sub,
        ContractActorType.ADMIN,
        isDisputed
          ? complete
            ? ContractAuditAction.DISPUTE_RELEASED
            : ContractAuditAction.DISPUTE_REFUNDED
          : complete
            ? ContractAuditAction.TIMEOUT_COMPLETED
            : ContractAuditAction.TIMEOUT_CANCELLED,
        previousStatus,
        contract.status,
        input.reason.trim(),
      );
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        complete
          ? MessageKind.CONTRACT_COMPLETED
          : MessageKind.CONTRACT_CANCELLED,
        {
          contractId: contract.id,
          resolution: input.resolution,
          reason: input.reason.trim(),
        },
        manager,
      );
      return { contract: saved, event };
    });
    await this.publishSafely(result.event);
    await Promise.all([
      this.notifyContract(
        result.contract.clientId,
        NotificationRecipientType.USER,
        result.contract,
        language,
      ),
      this.notifyContract(
        result.contract.providerId,
        NotificationRecipientType.PROVIDER,
        result.contract,
        language,
      ),
    ]);
    return this.findOneAdmin(input.contractId, language);
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
      categoryId,
      search,
      from,
      to,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = input;
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.conversation', 'conversation')
      .leftJoinAndSelect('conversation.listing', 'listing')
      .leftJoinAndSelect('listing.category', 'listingCategory')
      .leftJoinAndSelect('listing.provider', 'listingProvider')
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
      if (principal.type === 'provider') {
        query.andWhere('contract.status != :draftStatus', {
          draftStatus: ContractStatus.DRAFT,
        });
      }
    }
    if (conversationId) {
      query.andWhere('contract.conversationId = :conversationId', {
        conversationId,
      });
    }
    if (status) {
      query.andWhere('contract.status = :status', { status });
    }
    if (categoryId) {
      query.andWhere('contract.categoryId = :categoryId', { categoryId });
    }
    if (search?.trim()) {
      query.andWhere(
        `(contract."publicId"::text ILIKE :search
          OR conversation."publicId"::text ILIKE :search
          OR client.name ILIKE :search
          OR client.phone ILIKE :search
          OR provider.name ILIKE :search
          OR provider."commercialName" ILIKE :search
          OR provider.phone ILIKE :search
          OR listing.name ILIKE :search
          OR "listingCategory"."nameEn" ILIKE :search
          OR "listingCategory"."nameAr" ILIKE :search)`,
        { search: `%${search.trim()}%` },
      );
    }
    if (from) query.andWhere('contract.createdAt >= :from', { from });
    if (to) query.andWhere('contract.createdAt <= :to', { to });
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
      relations: CONTRACT_DETAIL_RELATIONS,
    });
    if (!contract) {
      throw this.notFound(language);
    }
    this.assertParticipant(contract, principal, language);
    if (
      contract.status === ContractStatus.DRAFT &&
      principal.type === 'provider'
    ) {
      throw this.unauthorized(language);
    }
    return contract;
  }

  async findOneAdmin(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: CONTRACT_DETAIL_RELATIONS,
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
    if (contract.status === ContractStatus.IN_PROGRESS) return contract;
    this.assertTransition(
      contract.status,
      ContractStatus.IN_PROGRESS,
      language,
    );
    contract.status = ContractStatus.IN_PROGRESS;
    contract.paidAt = contract.paidAt ?? new Date();
    const saved = await manager.getRepository(Contract).save(contract);
    await this.recordAudit(
      manager,
      saved,
      contract.clientId,
      ContractActorType.SYSTEM,
      ContractAuditAction.PAYMENT_COMPLETED,
      ContractStatus.ACCEPTED,
      ContractStatus.IN_PROGRESS,
    );
    return saved;
  }

  private async paymentForContract(
    contractId: string,
    manager: EntityManager,
  ): Promise<Payment> {
    const payment = await manager.getRepository(Payment).findOne({
      where: {
        contractId,
        purpose: PaymentPurpose.CONTRACT,
        status: PaymentStatus.COMPLETED,
      },
    });
    if (!payment) {
      throw new I18nBadRequestException(
        {
          en: 'The contract payment was not found',
          ar: 'لم يتم العثور على دفعة العقد',
        },
        'en',
      );
    }
    return payment;
  }

  private async addSettlement(
    manager: EntityManager,
    contract: Contract,
    payment: Payment,
    type: ContractSettlementType,
    amount: number,
    keySuffix: string,
    createdById: string,
    reason: string | null = null,
  ): Promise<void> {
    const rounded = this.round(Math.max(0, amount));
    if (rounded === 0) return;
    const repository = manager.getRepository(ContractSettlement);
    const idempotencyKey = `CONTRACT:${contract.id}:${keySuffix}:${type}`;
    const existing = await repository.findOne({ where: { idempotencyKey } });
    if (existing) return;
    await repository.save(
      repository.create({
        contractId: contract.id,
        paymentId: payment.id,
        type,
        amount: rounded,
        idempotencyKey,
        reason,
        createdById,
      }),
    );
  }

  private async settleCompleted(
    contract: Contract,
    manager: EntityManager,
    actorId: string,
  ): Promise<void> {
    const payment = await this.paymentForContract(contract.id, manager);
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.PROVIDER_RELEASE,
      Number(contract.providerNetAmount),
      'COMPLETED',
      actorId,
    );
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.PLATFORM_COMMISSION,
      Number(contract.commissionAmount),
      'COMPLETED',
      actorId,
    );
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.VAT,
      Number(contract.vatAmount),
      'COMPLETED',
      actorId,
    );
  }

  private async settleEarlyCancellation(
    contract: Contract,
    manager: EntityManager,
    actorId: string,
    reason: string,
  ): Promise<void> {
    const payment = await this.paymentForContract(contract.id, manager);
    const paid = Number(payment.amount);
    const deposit = Math.min(Number(contract.downPayment), paid);
    const commission = Math.min(Number(contract.commissionAmount), deposit);
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.CUSTOMER_REFUND,
      paid - deposit,
      'EARLY_CANCEL',
      actorId,
      reason,
    );
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.PROVIDER_RELEASE,
      deposit - commission,
      'EARLY_CANCEL',
      actorId,
      reason,
    );
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.PLATFORM_COMMISSION,
      commission,
      'EARLY_CANCEL',
      actorId,
      reason,
    );
  }

  private async holdDispute(
    contract: Contract,
    manager: EntityManager,
    actorId: string,
    reason: string,
  ): Promise<void> {
    const payment = await this.paymentForContract(contract.id, manager);
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.HOLD,
      Number(payment.amount),
      'DISPUTE',
      actorId,
      reason,
    );
  }

  private async settleFullRefund(
    contract: Contract,
    manager: EntityManager,
    actorId: string,
    reason: string,
  ): Promise<void> {
    const payment = await this.paymentForContract(contract.id, manager);
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.CUSTOMER_REFUND,
      Number(payment.amount),
      'ADMIN_REFUND',
      actorId,
      reason,
    );
  }

  private async recordAudit(
    manager: EntityManager,
    contract: Contract,
    actorId: string,
    actorType: ContractActorType,
    action: ContractAuditAction,
    previousStatus: ContractStatus,
    newStatus: ContractStatus,
    reason: string | null = null,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    const repository = manager.getRepository(ContractAudit);
    await repository.save(
      repository.create({
        contractId: contract.id,
        actorId,
        actorType,
        action,
        previousStatus,
        newStatus,
        reason,
        metadata,
      }),
    );
  }

  private async loadConversation(
    id: string,
    manager: EntityManager,
    language: LanguageCode,
    lock = false,
  ): Promise<Conversation> {
    const repository = manager.getRepository(Conversation);

    if (lock) {
      const lockedConversation = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedConversation) {
        throw this.conversationNotFound(language);
      }
    }

    const conversation = await repository.findOne({
      where: { id },
      relations: ['listing', 'provider'],
    });
    if (!conversation) {
      throw this.conversationNotFound(language);
    }
    return conversation;
  }

  private conversationNotFound(language: LanguageCode): I18nNotFoundException {
    const message = I18nService.translate(
      CONTRACT_ERROR_MESSAGES[CONTRACT_ERROR_CODES.CONVERSATION_NOT_FOUND],
      language,
    );
    return new I18nNotFoundException({ en: message, ar: message }, language);
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
      undertakingTextAr: category.undertakingEnabled
        ? (category.undertakingTextAr ?? '')
        : '',
      undertakingTextEn: category.undertakingEnabled
        ? (category.undertakingTextEn ?? '')
        : '',
      refundPolicyAr: category.refundPolicyEnabled
        ? (category.refundPolicyAr ?? '')
        : '',
      refundPolicyEn: category.refundPolicyEnabled
        ? (category.refundPolicyEn ?? '')
        : '',
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
    input: ContractDetailsInput,
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
      undertakingTextAr: snapshot.undertakingTextAr,
      undertakingTextEn: snapshot.undertakingTextEn,
      refundPolicyAr: snapshot.refundPolicyAr,
      refundPolicyEn: snapshot.refundPolicyEn,
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

  private async resolveCustomerSignature(
    userId: string,
    submittedSignature: string | undefined,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<string> {
    const repository = manager.getRepository(User);
    const user = await repository.findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) {
      throw this.error('CLIENT_NOT_FOUND', language);
    }
    if (user.contractSignature) {
      return user.contractSignature;
    }

    const signature = submittedSignature?.trim();
    if (!signature) {
      throw this.error('CUSTOMER_SIGNATURE_REQUIRED', language);
    }
    user.contractSignature = signature;
    await repository.save(user);
    return signature;
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }

  private async notifyContract(
    recipientId: string,
    recipientType: NotificationRecipientType,
    contract: Contract,
    language: LanguageCode,
  ): Promise<void> {
    if (!this.notificationService) return;
    const reference = contract.publicId ?? contract.id;
    try {
      await this.notificationService.createForRecipient({
        recipientId,
        recipientType,
        type: NotificationType.CONTRACT_UPDATE,
        title: language === 'ar' ? 'تحديث التعاقد' : 'Contract update',
        message:
          language === 'ar'
            ? `تم تحديث حالة التعاقد رقم ${reference} إلى ${contract.status}`
            : `Contract ${reference} is now ${contract.status.replaceAll('_', ' ').toLowerCase()}`,
        relatedEntityId: contract.id,
        relatedEntityType: 'contract',
      });
    } catch (error) {
      this.logger.warn(
        `Contract transition persisted but notification failed: ${String(error)}`,
      );
    }
  }

  private async publishSafely(
    payload: MessageAddedPayload | null,
  ): Promise<void> {
    if (!payload) return;
    try {
      await this.messageService.publish(payload);
    } catch (error) {
      this.logger.warn(
        `Contract event persisted but realtime publish failed: ${String(error)}`,
      );
    }
  }
}
