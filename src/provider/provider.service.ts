import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { PubSub } from 'graphql-subscriptions';
import { EmailService } from 'lib/email/email.service';
import { PUB_SUB } from 'lib/pubsub/pubsub.module';
import { EntityManager, In, Repository } from 'typeorm';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { Admin } from '../admin/entities/admin.entity';
import { Category } from '../category/entities/category.entity';
import { Provider } from '../provider/entities/provider.entity';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import {
  PROVIDER_ERROR_CODES,
  type ProviderErrorCode,
} from '../provider/errors/provider.error-codes';
import { PROVIDER_ERROR_MESSAGES } from '../provider/errors/provider.error-messages';
import { SettingService } from '../setting/setting.service';
import { SignedContract } from '../signed-contract/signed-contract.entity';
import { SignedContractService } from '../signed-contract/signed-contract.service';
import { CreateProviderInput } from './dto/create-provider.input';
import { ProviderPaginationInput } from './dto/provider-pagination.input';
import { SignContractInput } from './dto/sign-contract.input';
import { AdminTerminateContractInput } from './dto/terminate-contract.input';
import { UpdateProviderInput } from './dto/update-provider.input';
import { SignedContractStatus } from './enums/contract.enum';
import { AdminNotificationService } from '../notification/admin-notification.service';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import { notificationTexts } from '../notification/notification-texts';
import { NotificationService } from '../notification/notification.service';
import { providerHasUnfinishedContracts } from '../contract/unfinished-contracts';
import { Listing } from '../listing/entities/listing.entity';
import { ListingStatus } from '../listing/enums/listing.enum';

@Injectable()
export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SignedContract)
    private readonly signedContractRepository: Repository<SignedContract>,
    private readonly settingService: SettingService,
    private readonly signedContractService: SignedContractService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly emailService: EmailService,
    @Optional()
    private readonly adminNotifications?: AdminNotificationService,
    @Optional()
    private readonly notifications?: NotificationService,
  ) {}

  async create(
    createProviderInput: CreateProviderInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    // Check if a *verified* account already owns this email or phone.
    // Unverified accounts are stale placeholders; the real owner must be
    // allowed to re-register, so we only block on verified conflicts.
    const verifiedEmailOwner = await this.providerRepository.findOne({
      where: { email: createProviderInput.email, emailVerified: true },
    });
    if (verifiedEmailOwner) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.EMAIL_ALREADY_IN_USE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const verifiedPhoneOwner = await this.providerRepository.findOne({
      where: { phone: createProviderInput.phone, phoneVerified: true },
    });
    if (verifiedPhoneOwner) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PHONE_ALREADY_IN_USE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Remove any stale unverified records that hold the same email/phone so
    // the unique DB constraint doesn't block the new registration.
    await this.providerRepository.delete([
      { email: createProviderInput.email, emailVerified: false },
      { phone: createProviderInput.phone, phoneVerified: false },
    ]);

    // Hash password
    const hashedPassword = await bcrypt.hash(createProviderInput.password, 10);

    // Handle categories
    let categories: Category[] | undefined;
    if (
      createProviderInput.categoryIds &&
      createProviderInput.categoryIds.length > 0
    ) {
      categories = await this.categoryRepository.find({
        where: { id: In(createProviderInput.categoryIds) },
      });
    }

    const provider = this.providerRepository.create({
      ...createProviderInput,
      password: hashedPassword,
      categories,
      status: ProviderStatus.PENDING_APPROVAL,
    });

    const saved = await this.providerRepository.save(provider);
    const name = saved.commercialName ?? saved.name ?? saved.phone;
    await this.adminNotifications?.notifyAdmins({
      type: NotificationType.ADMIN_PROVIDER_REQUEST,
      ar: {
        title: 'طلب انضمام مقدم خدمة',
        message: `طلب انضمام جديد من ${name}`,
      },
      en: {
        title: 'Provider join request',
        message: `New join request from ${name}`,
      },
      relatedEntityType: 'provider_request',
      relatedEntityId: saved.id,
    });
    return saved;
  }

  async findAll(
    paginationInput: ProviderPaginationInput,
  ): Promise<IPaginatedType<Provider>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'DESC',
      status,
      search,
    } = paginationInput;

    const query = this.providerRepository
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.country', 'country')
      .leftJoinAndSelect('provider.city', 'city')
      .leftJoinAndSelect('provider.categories', 'categories')
      .leftJoinAndSelect('provider.signedContract', 'signedContract')
      .where('provider.emailVerified = true')
      .andWhere('provider.phoneVerified = true')
      .andWhere('provider.status IN (:...statuses)', {
        statuses: status
          ? [status]
          : [
              ProviderStatus.ACTIVE,
              ProviderStatus.INACTIVE,
              ProviderStatus.SUSPENDED,
            ],
      });

    if (search) {
      query.andWhere(
        '(provider.name ILIKE :search OR provider.email ILIKE :search OR provider.phone ILIKE :search OR "provider"."commercialName" ILIKE :search OR "provider"."publicId"::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      query.orderBy(`provider.${sortBy}`, sortOrder);
    } else {
      query.orderBy('provider.createdAt', sortOrder);
    }

    const total = await query.getCount();
    const providers = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: providers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id },
      relations: ['country', 'city', 'categories', 'signedContract'],
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return provider;
  }

  async findByEmail(
    email: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { email },
      relations: ['country', 'city', 'categories', 'signedContract'],
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return provider;
  }

  async findByPhone(
    phone: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { phone },
      relations: ['country', 'city', 'categories', 'signedContract'],
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return provider;
  }

  async update(
    providerId: string,
    updateProviderInput: UpdateProviderInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Handle categories if provided
    if (updateProviderInput.categoryIds) {
      const categories = await this.categoryRepository.find({
        where: { id: In(updateProviderInput.categoryIds) },
      });
      provider.categories = categories;
    }

    // Identity and credential fields have dedicated verified auth flows and
    // must never be changed by the generic profile update.
    const providerChanges = { ...updateProviderInput };
    for (const protectedField of [
      'id',
      'email',
      'phone',
      'password',
      'categoryIds',
    ] as const) {
      Reflect.deleteProperty(providerChanges, protectedField);
    }
    Object.assign(provider, providerChanges);

    return this.providerRepository.save(provider);
  }

  async activate(id: string, language: LanguageCode = 'en'): Promise<Provider> {
    const provider = await this.findOne(id, language);

    // Check if already active
    if (provider.status === ProviderStatus.ACTIVE) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_ALREADY_ACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    provider.status = ProviderStatus.ACTIVE;
    const saved = await this.providerRepository.save(provider);
    await this.pubSub.publish('providerUpdated', { providerUpdated: saved });
    return saved;
  }

  async deactivate(
    id: string,
    reason?: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    provider.status = ProviderStatus.INACTIVE;
    if (reason) {
      provider.deactivationReason = reason;
    }
    const saved = await this.providerRepository.save(provider);
    await this.pubSub.publish('providerUpdated', { providerUpdated: saved });
    return saved;
  }

  async rejectJoinRequest(
    id: string,
    reason: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    if (provider.status !== ProviderStatus.PENDING_APPROVAL) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.INVALID_STATUS_TRANSITION],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Store original email/phone so we can send the rejection email
    const originalEmail = provider.email;
    const originalName = provider.name ?? undefined;
    const locale = (provider.languageCode ?? 'en') as 'en' | 'ar';

    // Obfuscate email and phone so the same credentials can be re-used on registration
    provider.email = `REJECTED_${id}_${originalEmail}`;
    provider.phone = `REJECTED_${id}_${provider.phone}`;
    provider.status = ProviderStatus.REJECTED;
    provider.rejectionReason = reason;

    const saved = await this.providerRepository.save(provider);
    await this.pubSub.publish('providerUpdated', { providerUpdated: saved });

    // Send rejection email to the provider
    await this.emailService.sendRejectionEmail(
      originalEmail,
      reason,
      locale,
      originalName,
    );

    return saved;
  }

  async signContract(
    providerId: string,
    input: SignContractInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
      relations: ['signedContract'],
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // If a contract exists and is NOT pending, it is already active/terminated — block re-signing
    if (
      provider.signedContract &&
      provider.signedContract.status !== SignedContractStatus.PENDING
    ) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.CONTRACT_ALREADY_SIGNED],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const setting = await this.settingService.getSetting();
    if (
      setting.platformManagerSignature === null ||
      setting.platformManagerName === null
    ) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[
          PROVIDER_ERROR_CODES.PLATFORM_MANAGER_SIGNATURE_MISSING
        ],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    let signedContract: SignedContract | null = null;

    if (
      provider.signedContract &&
      provider.signedContract.status === SignedContractStatus.PENDING
    ) {
      // Update the existing pending contract to active
      const signedUpdatedContract = await this.signedContractService.update(
        provider.signedContract.id,
        {
          serviceProviderSignature: input.serviceProviderSignature,
          platformManagerSignature: setting.platformManagerSignature,
          platformManagerName: setting.platformManagerName,
          contractSignedAt: new Date(),
          status: SignedContractStatus.ACTIVE,
          acceptedRulesAr: input.acceptedRulesAr ?? null,
          acceptedRulesEn: input.acceptedRulesEn ?? null,
        },
      );
      if (signedUpdatedContract) {
        signedContract = signedUpdatedContract;
      }
    } else {
      // No existing contract — create a new one
      signedContract = await this.signedContractService.create({
        providerId: provider.id,
        provider: provider,
        serviceProviderSignature: input.serviceProviderSignature,
        platformManagerSignature: setting.platformManagerSignature,
        platformManagerName: setting.platformManagerName,
        contractSignedAt: new Date(),
        contractExpiresAt: null,
        status: SignedContractStatus.ACTIVE,
        terminationReason: null,
        acceptedRulesAr: input.acceptedRulesAr ?? null,
        acceptedRulesEn: input.acceptedRulesEn ?? null,
      });
    }

    if (signedContract) {
      provider.signedContract = signedContract;
    }
    return this.providerRepository.save(provider);
  }

  /**
   * S4-58 (D-22, PO 2026-10-20): the provider's "Terminate contract" sends a
   * request to the administration instead of deleting the account. Refused
   * while customer contracts are unfinished (BRD 4.3.7.3); the provider keeps
   * working until an admin approves or rejects it.
   */
  async terminateContract(
    providerId: string,
    terminationReason: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      this.throwNotFound(PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND, language);
    }
    const contract = provider.signedContract;
    if (!contract) {
      this.throwNotFound(PROVIDER_ERROR_CODES.NO_SIGNED_CONTRACT, language);
    }
    if (contract.status === SignedContractStatus.TERMINATION_REQUESTED) {
      this.throwBadRequest(
        PROVIDER_ERROR_CODES.TERMINATION_ALREADY_REQUESTED,
        language,
      );
    }
    if (contract.status !== SignedContractStatus.ACTIVE) {
      this.throwBadRequest(
        PROVIDER_ERROR_CODES.CONTRACT_ALREADY_TERMINATED,
        language,
      );
    }
    await this.assertNoUnfinishedContracts(provider.id, language);

    const reason = terminationReason.trim();
    provider.signedContract = await this.signedContractService.update(
      contract.id,
      {
        status: SignedContractStatus.TERMINATION_REQUESTED,
        terminationRequestedAt: new Date(),
        terminationRequestReason: reason,
      },
    );
    await this.pubSub.publish('providerUpdated', { providerUpdated: provider });

    const name = provider.commercialName ?? provider.name ?? provider.phone;
    await this.adminNotifications?.notifyAdmins({
      type: NotificationType.ADMIN_ECONTRACT_TERMINATION_REQUESTED,
      ar: {
        title: 'طلب فسخ عقد إلكتروني',
        message: `طلب ${name} فسخ العقد الإلكتروني. السبب: ${reason}`,
      },
      en: {
        title: 'E-contract termination request',
        message: `${name} asked to terminate their e-contract. Reason: ${reason}`,
      },
      relatedEntityType: 'signed_contract',
      relatedEntityId: contract.id,
    });
    return provider;
  }

  /**
   * S4-58: the admin approves a termination request. Re-checks unfinished
   * contracts (BRD "The contract is not terminated"), then deletes the
   * account like the low-rating auto-delete and emails the provider.
   */
  async approveContractTermination(
    adminId: string,
    providerId: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.findTerminationRequest(providerId, language);
    await this.assertNoUnfinishedContracts(provider.id, language);

    const originalEmail = provider.email;
    const reason =
      provider.signedContract.terminationRequestReason ??
      provider.signedContract.terminationReason ??
      '';
    const saved = await this.providerRepository.manager.transaction((manager) =>
      this.deleteProviderAccount(manager, provider, {
        contractStatus: SignedContractStatus.TERMINATED_BY_PROVIDER,
        reason,
        adminId,
      }),
    );
    await this.pubSub.publish('providerUpdated', { providerUpdated: saved });
    this.sendTerminationEmail(originalEmail, reason, provider);
    return saved;
  }

  /** S4-58: the admin rejects a request; the contract is Active again. */
  async rejectContractTermination(
    adminId: string,
    providerId: string,
    rejectionReason: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const request = await this.findTerminationRequest(providerId, language);
    const contractId = request.signedContract.id;
    const provider: Provider = request;
    const reason = rejectionReason.trim();
    provider.signedContract = await this.signedContractService.update(
      contractId,
      {
        status: SignedContractStatus.ACTIVE,
        terminationRejectedAt: new Date(),
        terminationRejectionReason: reason,
        terminationDecidedByAdminId: adminId,
      },
    );
    await this.pubSub.publish('providerUpdated', { providerUpdated: provider });
    await this.notifications?.notifyLocalized({
      recipientId: provider.id,
      recipientType: NotificationRecipientType.PROVIDER,
      type: NotificationType.ECONTRACT_TERMINATION_REJECTED,
      text: notificationTexts.eContractTerminationRejected(reason),
      relatedEntityType: 'signed_contract',
      relatedEntityId: contractId,
    });
    return provider;
  }

  private async findTerminationRequest(
    providerId: string,
    language: LanguageCode,
  ): Promise<Provider & { signedContract: SignedContract }> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      this.throwNotFound(PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND, language);
    }
    if (
      provider.signedContract?.status !==
      SignedContractStatus.TERMINATION_REQUESTED
    ) {
      this.throwBadRequest(
        PROVIDER_ERROR_CODES.NO_TERMINATION_REQUEST,
        language,
      );
    }
    return provider as Provider & { signedContract: SignedContract };
  }

  /** BRD 4.3.7.3: no termination while customer contracts are running. */
  private async assertNoUnfinishedContracts(
    providerId: string,
    language: LanguageCode,
  ): Promise<void> {
    if (
      await providerHasUnfinishedContracts(
        this.providerRepository.manager,
        providerId,
      )
    ) {
      this.throwBadRequest(
        PROVIDER_ERROR_CODES.CONTRACT_HAS_UNFINISHED_CONTRACTS,
        language,
      );
    }
  }

  private throwNotFound(
    code: ProviderErrorCode,
    language: LanguageCode,
  ): never {
    const message = I18nService.translate(
      PROVIDER_ERROR_MESSAGES[code],
      language,
    );
    throw new I18nNotFoundException({ en: message, ar: message }, language);
  }

  private throwBadRequest(
    code: ProviderErrorCode,
    language: LanguageCode,
  ): never {
    const message = I18nService.translate(
      PROVIDER_ERROR_MESSAGES[code],
      language,
    );
    throw new I18nBadRequestException({ en: message, ar: message }, language);
  }

  /**
   * Ends the e-contract (kept for audit), unpublishes the provider's ads and
   * soft-deletes the account, freeing its email and phone for re-registration.
   */
  private async deleteProviderAccount(
    manager: EntityManager,
    provider: Provider,
    options: {
      contractStatus: SignedContractStatus;
      reason: string;
      adminId?: string;
    },
  ): Promise<Provider> {
    const contract = provider.signedContract;
    if (
      contract &&
      (contract.status === SignedContractStatus.ACTIVE ||
        contract.status === SignedContractStatus.TERMINATION_REQUESTED)
    ) {
      const changes: Partial<SignedContract> = {
        status: options.contractStatus,
        terminationReason: options.reason,
        ...(options.adminId
          ? { terminationDecidedByAdminId: options.adminId }
          : {}),
      };
      await manager.update(SignedContract, contract.id, changes);
      Object.assign(contract, changes);
    }
    await manager.update(
      Listing,
      { providerId: provider.id },
      { status: ListingStatus.INACTIVE },
    );

    provider.email = `DELETED_${provider.id}_${provider.email}`;
    provider.phone = `DELETED_${provider.id}_${provider.phone}`;
    provider.status = ProviderStatus.DELETED;
    provider.isActive = false;
    provider.deletedAt = new Date();
    provider.deleteReason = options.reason;
    return manager.save(Provider, provider);
  }

  private sendTerminationEmail(
    email: string,
    reason: string,
    provider: Provider,
  ): void {
    void this.emailService
      .sendContractTerminationEmail(
        email,
        reason,
        (provider.languageCode as 'en' | 'ar') ?? 'ar',
        provider.name ?? undefined,
      )
      .catch((err) =>
        this.logger.error(`Failed to send termination email to ${email}`, err),
      );
  }

  /**
   * BRD 4.3.18: deletes a provider who stayed Under-improvement for a full
   * month. Ends the e-contract (kept for audit, unlike remove()), soft-deletes
   * the account, unpublishes their ads and emails them. The caller has already
   * checked that no contract is unfinished.
   */
  async autoDeleteForLowRating(
    providerId: string,
    reason: string,
  ): Promise<Provider | null> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });
    if (!provider || provider.deletedAt) return null;

    const originalEmail = provider.email;
    const saved = await this.providerRepository.manager.transaction((manager) =>
      this.deleteProviderAccount(manager, provider, {
        contractStatus: SignedContractStatus.TERMINATED_BY_ADMIN,
        reason,
      }),
    );
    await this.pubSub.publish('providerUpdated', { providerUpdated: saved });
    this.sendTerminationEmail(originalEmail, reason, provider);
    return saved;
  }

  async adminTerminateContract(
    adminId: string,
    input: AdminTerminateContractInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    const provider = await this.providerRepository.findOne({
      where: { id: input.providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract exists
    if (!provider.signedContract) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.NO_SIGNED_CONTRACT],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract is already terminated or expired
    if (
      provider.signedContract.status ===
        SignedContractStatus.TERMINATED_BY_PROVIDER ||
      provider.signedContract.status ===
        SignedContractStatus.TERMINATED_BY_ADMIN ||
      provider.signedContract.status === SignedContractStatus.EXPIRED
    ) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[
          PROVIDER_ERROR_CODES.CONTRACT_ALREADY_TERMINATED
        ],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // S4-58 / BRD 4.3.7.3: not while customer contracts are running.
    await this.assertNoUnfinishedContracts(provider.id, language);

    // Terminate contract
    const updatedContract = await this.signedContractService.update(
      provider.signedContract.id,
      {
        status: SignedContractStatus.TERMINATED_BY_ADMIN,
        terminationReason: input.terminationReason,
      },
    );

    // Deactivate provider account
    provider.isActive = false;
    provider.status = ProviderStatus.INACTIVE;
    provider.deactivationReason = input.terminationReason;
    provider.signedContract = updatedContract;
    const savedProvider = await this.providerRepository.save(provider);
    await this.pubSub.publish('providerUpdated', {
      providerUpdated: savedProvider,
    });

    // Notify provider by email (fire-and-forget, non-blocking)
    void this.emailService
      .sendContractTerminationEmail(
        provider.email,
        input.terminationReason,
        (provider.languageCode as 'en' | 'ar') ?? 'en',
        provider.name ?? undefined,
      )
      .catch((err) =>
        this.logger.error(
          `Failed to send termination email to ${provider.email}`,
          err,
        ),
      );

    return savedProvider;
  }

  async adminReactivateProvider(
    adminId: string,
    providerId: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    if (provider.status !== ProviderStatus.INACTIVE) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Reactivate provider account
    provider.isActive = true;
    provider.status = ProviderStatus.ACTIVE;
    provider.deactivationReason = null;
    const savedProvider = await this.providerRepository.save(provider);

    await this.signedContractRepository.update(
      {
        providerId: provider.id,
      },
      {
        status: SignedContractStatus.PENDING,
      },
    );

    // Notify provider by email (fire-and-forget, non-blocking)
    void this.emailService
      .sendProviderReactivationEmail(
        provider.email,
        (provider.languageCode as 'en' | 'ar') ?? 'en',
        provider.name ?? undefined,
      )
      .catch((err) =>
        this.logger.error(
          `Failed to send reactivation email to ${provider.email}`,
          err,
        ),
      );

    return savedProvider;
  }

  async remove(
    id: string,
    reason?: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    provider.deletedAt = new Date();
    if (reason) {
      provider.deleteReason = reason;
    }
    provider.status = ProviderStatus.DELETED;

    // Obfuscate email and phone so the same credentials can be re-used on re-registration
    provider.email = `DELETED_${id}_${provider.email}`;
    provider.phone = `DELETED_${id}_${provider.phone}`;

    // Delete the associated signed contract if it exists
    await this.signedContractService.deleteByProviderId(id);

    await this.providerRepository.save(provider);
    return provider;
  }

  async removeAvatar(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    await this.findOne(id, language);
    await this.providerRepository.update(id, { avatarFilename: null });
    return true;
  }
}
