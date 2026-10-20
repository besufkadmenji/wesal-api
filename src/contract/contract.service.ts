import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { localizeEnum } from '../../lib/i18n/localize-enum';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateContractInput } from './dto/create-contract.input';
import { InitializeContractInput } from './dto/initialize-contract.input';
import { ContractPaginationInput } from './dto/contract-pagination.input';
import { ContractQuoteInput } from './dto/contract-quote.input';
import { ContractQuote } from './dto/contract-quote.response';
import { CharitySummary } from './dto/charity-summary.response';
import { renderUndertaking } from '../category/contract-text-defaults';
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
import { CONTRACT_STATUS_LABELS } from './contract-status.labels';
import { ContractSignerType } from './enums/contract-signer-type.enum';
import { ContractSignatureType } from './enums/contract-signature-type.enum';
import { CONTRACT_ERROR_MESSAGES } from './errors/contract.error-messages';
import { CONTRACT_ERROR_CODES } from './errors/contract.error-codes';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SettingService } from '../setting/setting.service';
import { notificationTexts } from '../notification/notification-texts';
import { statusesInGroup } from './contract-status-group';
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
import { AdminNotificationService } from '../notification/admin-notification.service';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { Rating } from '../rating/entities/rating.entity';
import { RatingStatus } from '../rating/enums/rating-status.enum';
import { RatingService } from '../rating/rating.service';
import { earlyCancellationSplit } from './cancellation-outcome';
import {
  claimContractNumber,
  releaseContractNumbers,
} from './contract-number-pool';
import {
  CUSTOMER_OVERDUE_SQL,
  isCustomerOverdue,
  isProviderOverdue,
  overdueSince,
  PROVIDER_OVERDUE_SQL,
} from './contract-overdue';
import { CategoryStatus } from '../category/enum/category.enum';

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
    ContractStatus.ADMIN_RESOLVED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.DELIVERY_IN_PROGRESS]: [
    ContractStatus.COMPLETED,
    ContractStatus.CANCELLATION_REQUESTED,
    ContractStatus.DISPUTED,
    ContractStatus.ADMIN_RESOLVED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.CANCELLATION_REQUESTED]: [
    ContractStatus.CANCELLED,
    ContractStatus.DISPUTED,
  ],
  // Only the customer's signature completes a contract (decision 2026-10-19);
  // the administration closes disputes as ADMIN_RESOLVED or CANCELLED.
  [ContractStatus.DISPUTED]: [
    ContractStatus.ADMIN_RESOLVED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.COMPLETED]: [],
  [ContractStatus.CANCELLED]: [],
  [ContractStatus.ADMIN_RESOLVED]: [],
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

/** Money moved by a settlement, for the payout/refund notifications. */
type SettlementMoney = { payout: number; refund: number };

/** Never paid: cancelling one deletes it (BRD 4.1.18, D-13). */
/**
 * A checkout started this recently may still succeed at the gateway, so the
 * contract can't be removed yet (S4-10).
 */
const PENDING_CHECKOUT_WINDOW_MS = 30 * 60 * 1000;

const PRE_PAYMENT_STATUSES = [
  ContractStatus.DRAFT,
  ContractStatus.PENDING,
  ContractStatus.ACCEPTED,
];

/** Stored on contracts the deal window cancelled (both languages, one field). */
export const EXPIRED_CANCELLATION_REASON =
  'انتهت مدة المحادثة قبل سداد التعاقد / The chat ended before the contract was paid';

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
    @Optional()
    private readonly adminNotifications?: AdminNotificationService,
    @Optional()
    private readonly ratingService?: RatingService,
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
          ...(await this.reusedNumber(manager)),
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
            ...(await this.reusedNumber(manager)),
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
      'created',
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
        ...(await this.reusedNumber(manager)),
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
        contract.maxExecutionHours != null &&
        input.executionHours > contract.maxExecutionHours
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
      contract.executionHours = input.executionHours;
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
    // H-30: the row was read under lock without relations; return it with
    // the details GraphQL needs (non-null provider, signatures, …).
    return this.findOne(result.contract.id, principal, language);
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
    return this.findOne(result.contract.id, principal, language);
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
        return { contract, event: null, money: null };
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
      this.assertCustomerSigned(contract, [signature], language);
      contract.status = ContractStatus.COMPLETED;
      contract.completedAt = new Date();
      const saved = await manager.getRepository(Contract).save(contract);
      saved.signatures = [...(saved.signatures ?? []), signature];
      const money = await this.settleCompleted(
        contract,
        manager,
        principal.sub,
      );
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
      return { contract: saved, event, money };
    });
    await this.publishSafely(result.event);
    await this.notifyContract(
      result.contract.providerId,
      NotificationRecipientType.PROVIDER,
      result.contract,
      language,
    );
    await this.notifyMoney(result.contract, result.money);
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
      if (usesDelivery && !input.deliveryHours) {
        throw this.error('DELIVERY_HOURS_REQUIRED', language);
      }
      contract.providerCompletedAt = now;
      contract.deliveryHours = input.deliveryHours ?? null;
      contract.deliveryStartedAt = usesDelivery ? now : null;
      const graceHours = Math.max(
        1,
        Number(setting.completionConfirmationGraceHours ?? 24),
      );
      // Delivery and grace are both in hours (PO 2026-10-18).
      const deliveryHours = input.deliveryHours ?? 0;
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
        { deliveryHours: input.deliveryHours ?? null },
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
      // BRD 4.1.18: before payment the contract disappears entirely and its
      // number returns to the cycle (D-13, decision 2026-10-19).
      if (PRE_PAYMENT_STATUSES.includes(previousStatus)) {
        if (await this.hasPendingCheckout(contract, manager)) {
          throw this.error('CHECKOUT_PENDING', language);
        }
        const removed = {
          ...contract,
          status: ContractStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
        } as Contract;
        const event = await this.deleteUnpaidChain(contract, manager, reason);
        return {
          contract: removed,
          event,
          money: null,
          removed: true,
          // The provider never saw a draft, so it isn't notified.
          notify: previousStatus !== ContractStatus.DRAFT,
        };
      }
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
      let money: SettlementMoney | null = null;
      // BRD 4.1.18: past the provider's execution time, the customer gets
      // everything back, the provider nothing, and the contract counts 0★.
      const providerOverdue = isProviderOverdue(
        { ...contract, status: previousStatus },
        new Date(),
      );
      if (early) {
        contract.cancelledAt = new Date();
        if (providerOverdue) {
          money = await this.settleFullRefund(
            contract,
            manager,
            principal.sub,
            reason,
            'PROVIDER_OVERDUE',
          );
          await this.recordOverduePenalty(contract, manager);
        } else if (previousStatus === ContractStatus.IN_PROGRESS) {
          money = await this.settleEarlyCancellation(
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
        providerOverdue ? { providerOverdue: true } : null,
      );
      const event = await this.messageService.persistSystemEvent(
        contract.conversationId,
        early ? MessageKind.CONTRACT_CANCELLED : MessageKind.CONTRACT_DISPUTED,
        { contractId: contract.id, reason },
        manager,
      );
      return { contract: saved, event, money, removed: false };
    });
    await this.publishSafely(result.event);
    if ('removed' in result && result.removed) {
      // The record is gone: tell the provider without linking to it, and
      // answer with the final snapshot (the mutation's type is non-null).
      if ('notify' in result && result.notify) {
        await this.notifyRemoved(result.contract);
      }
      return result.contract;
    }
    await this.notifyContract(
      result.contract.providerId,
      NotificationRecipientType.PROVIDER,
      result.contract,
      language,
    );
    await this.notifyMoney(result.contract, result.money);
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
      // Paying the provider without the customer's signature closes the
      // contract as ADMIN_RESOLVED, never COMPLETED (decision 2026-10-19).
      const complete =
        input.resolution === ContractResolution.RELEASE_PROVIDER ||
        input.resolution === ContractResolution.COMPLETE;
      if (
        (complete && contract.status === ContractStatus.ADMIN_RESOLVED) ||
        (!complete && contract.status === ContractStatus.CANCELLED)
      ) {
        return { contract, event: null };
      }
      const previousStatus = contract.status;
      const isDisputed = previousStatus === ContractStatus.DISPUTED;
      const isConfirmationPending =
        previousStatus === ContractStatus.AWAITING_CUSTOMER_CONFIRMATION ||
        previousStatus === ContractStatus.DELIVERY_IN_PROGRESS;
      const isOverdue = isConfirmationPending && isCustomerOverdue(contract);
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
        ? ContractStatus.ADMIN_RESOLVED
        : ContractStatus.CANCELLED;
      let money: SettlementMoney;
      if (complete) {
        contract.resolvedAt = new Date();
        money = await this.settleCompleted(contract, manager, admin.sub);
      } else {
        contract.cancelledAt = new Date();
        money = await this.settleFullRefund(
          contract,
          manager,
          admin.sub,
          input.reason,
        );
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
          ? MessageKind.CONTRACT_ADMIN_RESOLVED
          : MessageKind.CONTRACT_CANCELLED,
        {
          contractId: contract.id,
          resolution: input.resolution,
          reason: input.reason.trim(),
        },
        manager,
      );
      return { contract: saved, event, money };
    });
    await this.publishSafely(result.event);
    await Promise.all([
      this.notifyContract(
        result.contract.clientId,
        NotificationRecipientType.USER,
        result.contract,
        language,
        null,
      ),
      this.notifyContract(
        result.contract.providerId,
        NotificationRecipientType.PROVIDER,
        result.contract,
        language,
        null,
      ),
    ]);
    await this.notifyMoney(result.contract, result.money);
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
      statusGroup,
      categoryId,
      isCharity,
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
      .leftJoinAndSelect('contract.signatures', 'signatures')
      .leftJoinAndSelect('contract.settlements', 'settlements')
      .leftJoinAndSelect('contract.audits', 'audits')
      .leftJoinAndSelect('contract.document', 'document');
    if (principal) {
      query.andWhere(
        principal.type === 'provider'
          ? 'contract.providerId = :principalId'
          : 'contract.clientId = :principalId',
        { principalId: principal.sub },
      );
      // Drafts are never listed for providers; customers only see their own
      // drafts when a conversation's contracts are read (to resume one).
      if (principal.type === 'provider' || !conversationId) {
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
    if (statusGroup) {
      query.andWhere('contract.status IN (:...groupStatuses)', {
        groupStatuses: statusesInGroup(statusGroup),
      });
    }
    if (categoryId) {
      query.andWhere('contract.categoryId = :categoryId', { categoryId });
    }
    if (isCharity !== undefined) {
      query.andWhere('contract.isCharity = :isCharity', { isCharity });
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

  /** Wesal Al-Khair totals for the admin; amounts count completed contracts only. */
  async charitySummary(from?: Date, to?: Date): Promise<CharitySummary> {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .select('COUNT(*)::int', 'contracts')
      .addSelect(
        'COUNT(*) FILTER (WHERE contract.status IN (:...settled))::int',
        'completedContracts',
      )
      .addSelect(
        'COALESCE(SUM(contract.charityAmount) FILTER (WHERE contract.status IN (:...settled)), 0)',
        'totalAmount',
      )
      .where('contract.isCharity = true')
      .setParameter('settled', [
        ContractStatus.COMPLETED,
        // Paid out by the administration: the commission was collected too.
        ContractStatus.ADMIN_RESOLVED,
      ]);
    if (from) query.andWhere('contract.createdAt >= :from', { from });
    if (to) query.andWhere('contract.createdAt <= :to', { to });
    const row = await query.getRawOne<{
      contracts: number;
      completedContracts: number;
      totalAmount: string;
    }>();
    return {
      contracts: Number(row?.contracts ?? 0),
      completedContracts: Number(row?.completedContracts ?? 0),
      totalAmount: Number(row?.totalAmount ?? 0),
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
    // BRD: once a deal is paid the chat stays open, so its timer stops.
    await manager
      .getRepository(Conversation)
      .update(contract.conversationId, { expiresAt: null });
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
  ): Promise<SettlementMoney> {
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
    return { payout: Number(contract.providerNetAmount), refund: 0 };
  }

  private async settleEarlyCancellation(
    contract: Contract,
    manager: EntityManager,
    actorId: string,
    reason: string,
  ): Promise<SettlementMoney> {
    const payment = await this.paymentForContract(contract.id, manager);
    const paid = Number(payment.amount);
    const split = earlyCancellationSplit(
      paid,
      Number(contract.downPayment),
      Number(contract.commissionAmount),
    );
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.CUSTOMER_REFUND,
      split.refund,
      'EARLY_CANCEL',
      actorId,
      reason,
    );
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.PROVIDER_RELEASE,
      split.provider,
      'EARLY_CANCEL',
      actorId,
      reason,
    );
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.PLATFORM_COMMISSION,
      split.commission,
      'EARLY_CANCEL',
      actorId,
      reason,
    );
    return { payout: split.provider, refund: split.refund };
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
    keySuffix = 'ADMIN_REFUND',
  ): Promise<SettlementMoney> {
    const payment = await this.paymentForContract(contract.id, manager);
    await this.addSettlement(
      manager,
      contract,
      payment,
      ContractSettlementType.CUSTOMER_REFUND,
      Number(payment.amount),
      keySuffix,
      actorId,
      reason,
    );
    return { payout: 0, refund: Number(payment.amount) };
  }

  /**
   * Decision 2026-10-19: "Completed" always means the customer signed
   * completion (they receive the work). Call before setting COMPLETED.
   */
  private assertCustomerSigned(
    contract: Contract,
    added: ContractSignature[],
    language: LanguageCode,
  ): void {
    const signed = [...(contract.signatures ?? []), ...added].some(
      (signature) =>
        signature.contractId === contract.id &&
        signature.signatureType === ContractSignatureType.CUSTOMER_COMPLETION,
    );
    if (!signed) throw this.error('CUSTOMER_SIGNATURE_REQUIRED', language);
  }

  /** A number released by a pre-payment deletion, if any (BRD 4.1.18). */
  private async reusedNumber(
    manager: EntityManager,
  ): Promise<{ publicId?: number }> {
    const number = await claimContractNumber(manager);
    return number ? { publicId: number } : {};
  }

  /** BRD 4.1.18: a provider-overdue cancellation counts as a 0★ rating. */
  private async recordOverduePenalty(
    contract: Contract,
    manager: EntityManager,
  ): Promise<void> {
    const ratings = manager.getRepository(Rating);
    const existing = await ratings.findOne({
      where: { contractId: contract.id },
    });
    if (existing) return;
    await ratings.save(
      ratings.create({
        userId: contract.clientId,
        listingId: contract.listingId,
        providerId: contract.providerId,
        contractId: contract.id,
        rating: 0,
        comment: null,
        status: RatingStatus.PUBLISHED,
        isSystemGenerated: true,
      }),
    );
    await this.ratingService?.recalculate(
      manager,
      contract.listingId,
      contract.providerId,
    );
  }

  /** S4-4: the principal's overdue contracts, oldest deadline first. */
  async myOverdueContracts(principal: JwtPayload): Promise<Contract[]> {
    if (principal.type !== 'user' && principal.type !== 'provider') return [];
    const customer = principal.type === 'user';
    const matches = await this.contractRepository
      .createQueryBuilder('contract')
      .select('contract.id', 'id')
      .where(
        customer ? 'contract.clientId = :id' : 'contract.providerId = :id',
        { id: principal.sub },
      )
      .andWhere(customer ? CUSTOMER_OVERDUE_SQL : PROVIDER_OVERDUE_SQL, {
        now: new Date(),
      })
      .getRawMany<{ id: string }>();
    if (matches.length === 0) return [];
    // Hydrated like contract details, so the web can reuse ContractFields.
    const contracts = await this.contractRepository.find({
      where: { id: In(matches.map((match) => match.id)) },
      relations: CONTRACT_DETAIL_RELATIONS,
    });
    return contracts.sort(
      (a, b) =>
        (overdueSince(a)?.getTime() ?? 0) - (overdueSince(b)?.getTime() ?? 0),
    );
  }

  /**
   * S4-12: paid contracts whose provider hasn't seen the "contract paid,
   * please execute" pop-up yet, oldest payment first.
   */
  async myPaidContractNotices(principal: JwtPayload): Promise<Contract[]> {
    if (principal.type !== 'provider') return [];
    const contracts = await this.contractRepository.find({
      where: {
        providerId: principal.sub,
        status: ContractStatus.IN_PROGRESS,
        paidAt: Not(IsNull()),
        providerPaidNoticeAt: IsNull(),
      },
      relations: CONTRACT_DETAIL_RELATIONS,
      order: { paidAt: 'ASC' },
    });
    return contracts;
  }

  async acknowledgeContractPaid(
    contractId: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
    });
    if (!contract) throw this.notFound(language);
    if (
      principal.type !== 'provider' ||
      principal.sub !== contract.providerId
    ) {
      throw this.unauthorized(language);
    }
    if (!contract.providerPaidNoticeAt) {
      await this.contractRepository.update(
        { id: contract.id, providerPaidNoticeAt: IsNull() },
        { providerPaidNoticeAt: new Date() },
      );
    }
    return true;
  }

  /**
   * S4-2: flag newly overdue contracts once and tell the party; the web
   * pop-up itself reads `myOverdueContracts`.
   */
  @Interval(60_000)
  async flagOverdueContracts(): Promise<void> {
    const now = new Date();
    const sides = [
      {
        sql: PROVIDER_OVERDUE_SQL,
        stamp: 'providerOverdueAt' as const,
        recipient: (contract: Contract) => contract.providerId,
        recipientType: NotificationRecipientType.PROVIDER,
      },
      {
        sql: CUSTOMER_OVERDUE_SQL,
        stamp: 'customerOverdueAt' as const,
        recipient: (contract: Contract) => contract.clientId,
        recipientType: NotificationRecipientType.USER,
      },
    ];
    for (const side of sides) {
      const due = await this.contractRepository
        .createQueryBuilder('contract')
        .where(side.sql, { now })
        .andWhere(`contract.${side.stamp} IS NULL`)
        .getMany();
      for (const contract of due) {
        const result = await this.contractRepository.update(
          { id: contract.id, [side.stamp]: IsNull() },
          { [side.stamp]: now },
        );
        if (result.affected !== 1 || !this.notificationService) continue;
        await this.notificationService.notifyLocalized({
          recipientId: side.recipient(contract),
          recipientType: side.recipientType,
          type: NotificationType.CONTRACT_OVERDUE,
          text: notificationTexts.contractOverdue(
            contract.publicId ?? contract.id,
          ),
          relatedEntityId: contract.id,
          relatedEntityType: 'contract',
        });
      }
    }
  }

  /**
   * S4-2: when a chat's deal window runs out, its unpaid contracts are
   * cancelled (kept for audit, D-13 default); the chat itself is closed by
   * ConversationService and its fee becomes payable again on restart.
   */
  @Interval(60_000)
  async cancelExpiredUnpaidContracts(): Promise<void> {
    const unpaid = [
      ContractStatus.DRAFT,
      ContractStatus.PENDING,
      ContractStatus.ACCEPTED,
      ContractStatus.REJECTED,
    ];
    const expired = await this.contractRepository
      .createQueryBuilder('contract')
      .innerJoin('contract.conversation', 'conversation')
      .where('contract.status IN (:...unpaid)', { unpaid })
      .andWhere('conversation.expiresAt IS NOT NULL')
      .andWhere('conversation.expiresAt <= :now', { now: new Date() })
      .getMany();
    for (const contract of expired) {
      try {
        await this.expireUnpaidContract(contract, unpaid);
      } catch (error) {
        this.logger.error(
          `Could not expire contract ${contract.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async expireUnpaidContract(
    contract: Contract,
    unpaid: ContractStatus[],
  ): Promise<void> {
    const reason = EXPIRED_CANCELLATION_REASON;
    const event = await this.dataSource.transaction(async (manager) => {
      // Re-read under lock: an earlier chain deletion may have removed it.
      const current = await manager.getRepository(Contract).findOne({
        where: { id: contract.id, status: In(unpaid) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) return null;
      if (await this.hasPendingCheckout(current, manager)) return null;
      return this.deleteUnpaidChain(current, manager, reason, {
        expired: true,
      });
    });
    if (!event) return;
    await this.publishSafely(event);
    if (contract.status === ContractStatus.DRAFT) return;
    if (!this.notificationService) return;
    const text = notificationTexts.contractExpired(
      contract.publicId ?? contract.id,
    );
    for (const [recipientId, recipientType] of [
      [contract.clientId, NotificationRecipientType.USER],
      [contract.providerId, NotificationRecipientType.PROVIDER],
    ] as const) {
      await this.notificationService.notifyLocalized({
        recipientId,
        recipientType,
        type: NotificationType.CONTRACT_UPDATE,
        text,
      });
    }
  }

  private async hasPendingCheckout(
    contract: Contract,
    manager: EntityManager,
  ): Promise<boolean> {
    // updatedAt is a database-clock timestamp, so compare on that clock.
    const pending = await manager
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .where('payment.contractId = :id', { id: contract.id })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere(`payment.updatedAt > now() - make_interval(secs => :seconds)`, {
        seconds: PENDING_CHECKOUT_WINDOW_MS / 1000,
      })
      .getCount();
    return pending > 0;
  }

  /**
   * BRD 4.1.16 / 4.1.18 (D-13): a contract that was never paid is removed
   * with its whole version chain; its numbers return to the pool. The chat
   * keeps one event with the number and reason (no link), and complaints and
   * notifications that pointed at it are unlinked. Runs in the caller's
   * transaction.
   */
  private async deleteUnpaidChain(
    contract: Contract,
    manager: EntityManager,
    reason: string,
    metadata: Record<string, unknown> = {},
  ): Promise<MessageAddedPayload> {
    const repository = manager.getRepository(Contract);
    const chain = [contract];
    let previousId = contract.supersedesContractId;
    while (previousId) {
      const previous = await repository.findOne({ where: { id: previousId } });
      if (!previous || previous.paidAt) break;
      chain.push(previous);
      previousId = previous.supersedesContractId;
    }
    if (chain.some((entry) => entry.paidAt)) {
      throw new Error(`Contract ${contract.id} was paid; it cannot be removed`);
    }
    const ids = chain.map((entry) => entry.id);
    const unsettled = In([
      PaymentStatus.PENDING,
      PaymentStatus.PROCESSING,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ]);
    const [payments, ratings] = await Promise.all([
      manager.getRepository(Payment).count({
        where: { contractId: In(ids), status: Not(unsettled) },
      }),
      manager.getRepository(Rating).count({ where: { contractId: In(ids) } }),
    ]);
    if (payments || ratings) {
      throw new Error(`Contract ${contract.id} has payments or ratings`);
    }
    // Abandoned or failed checkouts leave with the contract; a late gateway
    // success for them is reported to admins as unmatched (S4-10).
    await manager
      .getRepository(Payment)
      .delete({ contractId: In(ids), status: unsettled });
    await manager.query(
      'UPDATE "complaints" SET "contractId" = NULL WHERE "contractId" = ANY($1::uuid[])',
      [ids],
    );
    await manager.query(
      `UPDATE "notifications" SET "relatedEntityId" = NULL
       WHERE "relatedEntityType" = 'contract' AND "relatedEntityId" = ANY($1::uuid[])`,
      [ids],
    );
    const event = await this.messageService.persistSystemEvent(
      contract.conversationId,
      MessageKind.CONTRACT_CANCELLED,
      {
        contractNumber: contract.publicId,
        reason,
        removed: true,
        ...metadata,
      },
      manager,
    );
    await repository.delete({ id: In(ids) });
    await releaseContractNumbers(
      manager,
      chain.map((entry) => entry.publicId),
    );
    return event;
  }

  /** The provider learns of a pre-payment cancellation; no link to follow. */
  private async notifyRemoved(contract: Contract): Promise<void> {
    if (!this.notificationService) return;
    const reference = contract.publicId ?? contract.id;
    await this.notificationService.notifyLocalized({
      recipientId: contract.providerId,
      recipientType: NotificationRecipientType.PROVIDER,
      type: NotificationType.CONTRACT_UPDATE,
      text: notificationTexts.contractStatus(reference, {
        ar: localizeEnum(
          CONTRACT_STATUS_LABELS,
          ContractStatus.CANCELLED,
          'ar',
        ),
        en: localizeEnum(
          CONTRACT_STATUS_LABELS,
          ContractStatus.CANCELLED,
          'en',
        ),
      }),
    });
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
    // S4-56: no new contract terms in an inactive category.
    if (category.status === CategoryStatus.INACTIVE) {
      throw this.error('CATEGORY_INACTIVE', language);
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
    // PO 2026-10-18: a contract whose calculated commission is at or below
    // the category minimum is charity (Wesal Al-Khair). The commission is
    // still deducted from the provider's payout like any other, but it is
    // set aside for donation through Ihsan instead of being platform revenue.
    const calculatedCommission = this.round(price * (commissionPercent / 100));
    const isCharity =
      commissionPercent > 0 &&
      threshold > 0 &&
      calculatedCommission <= threshold;
    const commissionAmount = calculatedCommission;
    const charityAmount = isCharity ? calculatedCommission : 0;
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
      // {commission} / {minimum} are filled with this contract's terms.
      undertakingTextAr: category.undertakingEnabled
        ? renderUndertaking(
            category.undertakingTextAr ?? '',
            commissionPercent,
            threshold,
          )
        : '',
      undertakingTextEn: category.undertakingEnabled
        ? renderUndertaking(
            category.undertakingTextEn ?? '',
            commissionPercent,
            threshold,
          )
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
      isCharity,
      charityAmount,
      vatRate,
      vatAmount,
      totalPayable: this.round(price + vatAmount),
      providerNetAmount: this.round(price - commissionAmount),
      contractDocumentText: category.contractDocumentEnabled
        ? category.contractDocumentText
        : '',
      maxExecutionHours: category.maxExecutionHoursEnabled
        ? category.maxExecutionHours
        : null,
      maxTerminationHours: category.maxTerminationHoursEnabled
        ? category.maxTerminationHours
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
      isCharity: snapshot.isCharity,
      charityAmount: snapshot.charityAmount,
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
      maxExecutionHours: snapshot.maxExecutionHours,
      maxTerminationHours: snapshot.maxTerminationHours,
      executionHours: null,
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
      isCharity: snapshot.isCharity,
      charityAmount: snapshot.charityAmount,
      vatRate: snapshot.vatRate,
      vatAmount: snapshot.vatAmount,
      totalPayable: snapshot.totalPayable,
      providerNetAmount: snapshot.providerNetAmount,
      contractDocumentText: snapshot.contractDocumentText,
      undertakingTextAr: snapshot.undertakingTextAr,
      undertakingTextEn: snapshot.undertakingTextEn,
      refundPolicyAr: snapshot.refundPolicyAr,
      refundPolicyEn: snapshot.refundPolicyEn,
      maxExecutionHours: snapshot.maxExecutionHours,
      maxTerminationHours: snapshot.maxTerminationHours,
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

  /** BRD 4.3.25: admins hear about new contracts and status changes, with names. */
  private async notifyAdminsOfContract(
    contract: Contract,
    event: 'created' | 'status',
  ): Promise<void> {
    if (!this.adminNotifications) return;
    try {
      const loaded = await this.contractRepository.findOne({
        where: { id: contract.id },
        relations: ['client', 'provider'],
      });
      const reference = contract.publicId ?? contract.id;
      const customer = loaded?.client?.name ?? '—';
      const provider =
        loaded?.provider?.commercialName ?? loaded?.provider?.name ?? '—';
      const statusAr = localizeEnum(
        CONTRACT_STATUS_LABELS,
        contract.status,
        'ar',
      );
      const statusEn = localizeEnum(
        CONTRACT_STATUS_LABELS,
        contract.status,
        'en',
      );
      await this.adminNotifications.notifyAdmins(
        event === 'created'
          ? {
              type: NotificationType.ADMIN_CONTRACT_CREATED,
              ar: {
                title: 'تعاقد جديد',
                message: `تم إنشاء التعاقد رقم ${reference} بين ${customer} و${provider}`,
              },
              en: {
                title: 'New contract',
                message: `Contract ${reference} was created between ${customer} and ${provider}`,
              },
              relatedEntityType: 'contract',
              relatedEntityId: contract.id,
            }
          : {
              type: NotificationType.ADMIN_CONTRACT_STATUS,
              ar: {
                title: 'تحديث حالة تعاقد',
                message: `التعاقد رقم ${reference} بين ${customer} و${provider} أصبح ${statusAr}`,
              },
              en: {
                title: 'Contract status changed',
                message: `Contract ${reference} between ${customer} and ${provider} is now ${statusEn}`,
              },
              relatedEntityType: 'contract',
              relatedEntityId: contract.id,
            },
      );
    } catch (error) {
      this.logger.warn(`Admin contract notification failed: ${String(error)}`);
    }
  }

  private async notifyContract(
    recipientId: string,
    recipientType: NotificationRecipientType,
    contract: Contract,
    language: LanguageCode,
    adminEvent: 'created' | 'status' | null = 'status',
  ): Promise<void> {
    if (adminEvent) await this.notifyAdminsOfContract(contract, adminEvent);
    if (!this.notificationService) return;
    const reference = contract.publicId ?? contract.id;
    const status = {
      ar: localizeEnum(CONTRACT_STATUS_LABELS, contract.status, 'ar'),
      en: localizeEnum(CONTRACT_STATUS_LABELS, contract.status, 'en'),
    };
    // Both languages, so the recipient reads their own (D-11), whatever
    // language the actor used.
    await this.notificationService.notifyLocalized({
      recipientId,
      recipientType,
      type: NotificationType.CONTRACT_UPDATE,
      text: notificationTexts.contractStatus(reference, status),
      relatedEntityId: contract.id,
      relatedEntityType: 'contract',
    });
  }

  /** S4-38: payout to the provider and refund to the customer, after commit. */
  private async notifyMoney(
    contract: Contract,
    money: SettlementMoney | null | undefined,
  ): Promise<void> {
    if (!money || !this.notificationService) return;
    const reference = contract.publicId ?? contract.id;
    if (money.payout > 0) {
      await this.notificationService.notifyLocalized({
        recipientId: contract.providerId,
        recipientType: NotificationRecipientType.PROVIDER,
        type: NotificationType.PAYOUT_TRANSFERRED,
        text: notificationTexts.payout(reference, money.payout),
        relatedEntityId: contract.id,
        relatedEntityType: 'contract',
      });
    }
    if (money.refund > 0) {
      await this.notificationService.notifyLocalized({
        recipientId: contract.clientId,
        recipientType: NotificationRecipientType.USER,
        type: NotificationType.REFUND_ISSUED,
        text: notificationTexts.refund(reference, money.refund),
        relatedEntityId: contract.id,
        relatedEntityType: 'contract',
      });
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
