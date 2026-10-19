import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Listing } from '../listing/entities/listing.entity';
import { Provider } from '../provider/entities/provider.entity';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CategoryPaginationInput } from './dto/category-pagination.input';
import { CategoryContractDefaults } from './dto/category-contract-defaults.response';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { Category } from './entities/category.entity';
import { CATEGORY_ERROR_MESSAGES } from './errors/category.error-messages';
import { TrackingService } from '../tracking/tracking.service';
import { TargetType } from '../tracking/enums/target-type.enum';
import { ActionType } from '../tracking/enums/action-type.enum';
import { CategoryStatus } from './enum/category.enum';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { SearchService } from '../search/search.service';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import { notificationTexts } from '../notification/notification-texts';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { NotificationService } from '../notification/notification.service';
import { SettingService } from '../setting/setting.service';
import { findContractControlProblem } from './contract-controls';
import {
  DEFAULT_CONTRACT_DOCUMENT_TEXT,
  DEFAULT_REFUND_POLICY_AR,
  DEFAULT_REFUND_POLICY_EN,
  DEFAULT_UNDERTAKING_TEXT_AR,
  DEFAULT_UNDERTAKING_TEXT_EN,
} from './contract-text-defaults';

/** Contracts that block deactivating or deleting their category. */
export const UNFINISHED_CONTRACT_STATUSES: ContractStatus[] = [
  ContractStatus.PENDING,
  ContractStatus.ACCEPTED,
  ContractStatus.IN_PROGRESS,
  ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
  ContractStatus.DELIVERY_IN_PROGRESS,
  ContractStatus.CANCELLATION_REQUESTED,
  ContractStatus.DISPUTED,
];

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    private readonly trackingService: TrackingService,
    private readonly searchService: SearchService,
    @Optional()
    @InjectRepository(Contract)
    private readonly contractRepository?: Repository<Contract>,
    @Optional()
    private readonly settingService?: SettingService,
    @Optional()
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * BRD 4.3.8 / 4.3.17: values the admin leaves out come from the global
   * Settings defaults, and empty texts get the BRD default wording.
   */
  async create(
    createCategoryInput: CreateCategoryInput,
    language: LanguageCode = 'en',
  ): Promise<Category> {
    const input = await this.withDefaults(createCategoryInput);
    this.assertContractControls(input, language);
    const category = this.categoryRepository.create(input);
    const saved = await this.categoryRepository.save(category);
    // Index in Elasticsearch asynchronously
    this.searchService
      .indexCategory(saved)
      .catch((err) => console.error('Failed to index category in ES', err));
    return saved;
  }

  async findAll(
    paginationInput: CategoryPaginationInput,
    userId?: string,
    isAdmin?: boolean,
  ): Promise<IPaginatedType<Category>> {
    const { page = 1, limit = 10, search, status } = paginationInput;
    const skip = (page - 1) * limit;

    // Non-admins can only see active categories unless an explicit status filter is provided by admin
    const effectiveStatus = isAdmin
      ? status
      : (status ?? CategoryStatus.ACTIVE);

    let items: Category[];
    let total: number;

    // Use Elasticsearch when a search query is present
    if (search && search.trim() && this.searchService.isEnabled) {
      const esResult = await this.searchService.searchCategories(
        search.trim(),
        page,
        limit,
      );

      if (esResult.total > 0) {
        const loaded = await this.searchService.loadCategoriesById(
          esResult.ids,
        );
        items = effectiveStatus
          ? loaded.filter((c) => c.status === effectiveStatus)
          : loaded;
        total = items.length;
      } else {
        items = [];
        total = 0;
      }
    } else {
      // Fallback: Postgres ILIKE search with optional popularity ranking
      const queryBuilder =
        this.categoryRepository.createQueryBuilder('category');

      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        queryBuilder.where(
          '(category.nameEn ILIKE :search OR category.nameAr ILIKE :search OR category.descriptionEn ILIKE :search OR category.descriptionAr ILIKE :search OR "category"."publicId"::text ILIKE :search)',
          { search: searchTerm },
        );
      }

      if (effectiveStatus) {
        queryBuilder.andWhere('category.status = :status', {
          status: effectiveStatus,
        });
      }

      if (userId) {
        const popularCategories =
          await this.trackingService.getPopularCategories(userId, 50);
        const popularIds = popularCategories.map((p) => p.categoryId);
        if (popularIds.length > 0) {
          queryBuilder.addSelect(
            `CASE WHEN category.id IN (:...popularIds) THEN 0 ELSE 1 END`,
            'popularity_rank',
          );
          queryBuilder.setParameter('popularIds', popularIds);
          queryBuilder.orderBy('popularity_rank', 'ASC');
          queryBuilder.addOrderBy('category.createdAt', 'DESC');
        } else {
          queryBuilder.orderBy('category.createdAt', 'DESC');
        }
      } else {
        queryBuilder.orderBy('category.createdAt', 'DESC');
      }

      [items, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();
    }

    // Track views for logged-in users
    if (userId && items.length > 0) {
      Promise.all(
        items.map((item) =>
          this.trackingService.trackAction(userId, {
            targetType: TargetType.CATEGORY,
            targetId: item.id,
            actionType: ActionType.VIEW,
          }),
        ),
      ).catch((err) => {
        console.error('Failed to track category views:', err);
      });
    }

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
    language: LanguageCode = 'en',
    userId?: string,
    isAdmin?: boolean,
  ): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Non-admins cannot see inactive categories
    if (!isAdmin && category.status !== CategoryStatus.ACTIVE) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Track view for logged-in users
    if (userId) {
      this.trackingService
        .trackAction(userId, {
          targetType: TargetType.CATEGORY,
          targetId: id,
          actionType: ActionType.CLICK,
        })
        .catch((err) => {
          console.error('Failed to track category view:', err);
        });
    }

    return category;
  }

  async update(
    updateCategoryInput: UpdateCategoryInput,
    language: LanguageCode = 'en',
  ): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id: updateCategoryInput.id },
    });
    if (!category) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    Object.assign(category, updateCategoryInput);
    this.assertContractControls(category, language);
    const saved = await this.categoryRepository.save(category);
    // Keep Elasticsearch index in sync
    this.searchService
      .indexCategory(saved)
      .catch((err) => console.error('Failed to update category in ES', err));
    return saved;
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Category> {
    const category = await this.findOne(id, language, undefined, true);

    const listingCount = await this.listingRepository.count({
      where: { categoryId: id },
    });

    if (listingCount > 0) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_IN_USE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const providerCount = await this.providerRepository
      .createQueryBuilder('provider')
      .innerJoin('provider.categories', 'category')
      .where('category.id = :categoryId', { categoryId: id })
      .getCount();

    if (providerCount > 0) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_IN_USE_BY_PROVIDERS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }
    await this.assertNoOpenContracts(id, language);

    await this.categoryRepository.delete({ id });
    // Remove from Elasticsearch index
    this.searchService
      .removeCategory(id)
      .catch((err) => console.error('Failed to remove category from ES', err));
    return category;
  }

  async activate(id: string, language: LanguageCode = 'en'): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    if (category.status === CategoryStatus.ACTIVE) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_ALREADY_ACTIVE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    category.status = CategoryStatus.ACTIVE;
    const saved = await this.categoryRepository.save(category);
    this.searchService
      .indexCategory(saved)
      .catch((err) =>
        console.error('Failed to update category status in ES', err),
      );
    await this.notifyProviders(saved, true);
    return saved;
  }

  async deactivate(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    if (category.status === CategoryStatus.INACTIVE) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_ALREADY_INACTIVE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // BRD 4.3.8: blocked while any (non-deleted) provider is linked, or
    // while a contract in this category is unfinished.
    const providerCount = await this.linkedProviders(id).getCount();
    if (providerCount > 0) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_HAS_PROVIDERS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }
    await this.assertNoOpenContracts(id, language);

    category.status = CategoryStatus.INACTIVE;
    const saved = await this.categoryRepository.save(category);
    this.searchService
      .indexCategory(saved)
      .catch((err) =>
        console.error('Failed to update category status in ES', err),
      );
    await this.notifyProviders(saved, false);
    return saved;
  }

  private linkedProviders(categoryId: string) {
    return this.providerRepository
      .createQueryBuilder('provider')
      .innerJoin('provider.categories', 'category')
      .where('category.id = :categoryId', { categoryId })
      .andWhere('provider.deletedAt IS NULL')
      .andWhere('provider.status != :deleted', {
        deleted: ProviderStatus.DELETED,
      });
  }

  private async assertNoOpenContracts(
    categoryId: string,
    language: LanguageCode,
  ): Promise<void> {
    if (!this.contractRepository) return;
    const open = await this.contractRepository.count({
      where: { categoryId, status: In(UNFINISHED_CONTRACT_STATUSES) },
    });
    if (open > 0) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_HAS_OPEN_CONTRACTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }
  }

  private assertContractControls(
    category: Partial<Category>,
    language: LanguageCode,
  ): void {
    const problem = findContractControlProblem(category);
    if (!problem) return;
    const message = I18nService.translate(
      CATEGORY_ERROR_MESSAGES[
        problem.kind === 'value'
          ? 'CONTRACT_VALUE_REQUIRED'
          : 'CONTRACT_TEXT_REQUIRED'
      ],
      language,
    );
    throw new I18nBadRequestException({ en: message, ar: message }, language);
  }

  /** Settings values (0 when unset) and the BRD default texts. */
  async contractDefaults(): Promise<CategoryContractDefaults> {
    const setting = await this.settingService?.getSetting();
    const value = (amount?: number | null) => Number(amount ?? 0);
    return {
      commissionPercent: value(setting?.defaultCommissionPercent),
      minCommissionAmount: value(setting?.defaultMinCommissionAmount),
      depositPercent: value(setting?.defaultDepositPercent),
      maxExecutionHours: value(setting?.defaultMaxExecutionHours),
      maxTerminationHours: value(setting?.defaultMaxTerminationHours),
      customerConversationFee: value(setting?.defaultCustomerConversationFee),
      providerConversationFee: value(setting?.defaultProviderConversationFee),
      contractDocumentText: DEFAULT_CONTRACT_DOCUMENT_TEXT,
      undertakingTextAr: DEFAULT_UNDERTAKING_TEXT_AR,
      undertakingTextEn: DEFAULT_UNDERTAKING_TEXT_EN,
      refundPolicyAr: DEFAULT_REFUND_POLICY_AR,
      refundPolicyEn: DEFAULT_REFUND_POLICY_EN,
    };
  }

  /** Fills values the input leaves out and texts it leaves empty. */
  private async withDefaults(
    input: CreateCategoryInput,
  ): Promise<CreateCategoryInput> {
    const defaults = await this.contractDefaults();
    return {
      ...input,
      commissionPercent: input.commissionPercent ?? defaults.commissionPercent,
      minCommissionAmount:
        input.minCommissionAmount ?? defaults.minCommissionAmount,
      depositPercent: input.depositPercent ?? defaults.depositPercent,
      maxExecutionHours: input.maxExecutionHours ?? defaults.maxExecutionHours,
      maxTerminationHours:
        input.maxTerminationHours ?? defaults.maxTerminationHours,
      customerConversationFee:
        input.customerConversationFee ?? defaults.customerConversationFee,
      providerConversationFee:
        input.providerConversationFee ?? defaults.providerConversationFee,
      contractDocumentText:
        input.contractDocumentText?.trim() || defaults.contractDocumentText,
      undertakingTextAr:
        input.undertakingTextAr?.trim() || defaults.undertakingTextAr,
      undertakingTextEn:
        input.undertakingTextEn?.trim() || defaults.undertakingTextEn,
      refundPolicyAr: input.refundPolicyAr?.trim() || defaults.refundPolicyAr,
      refundPolicyEn: input.refundPolicyEn?.trim() || defaults.refundPolicyEn,
    };
  }

  /** BRD 4.3.8: "a message is sent to providers on activate/deactivate". */
  private async notifyProviders(
    category: Category,
    active: boolean,
  ): Promise<void> {
    if (!this.notificationService) return;
    try {
      const providers = await this.providerRepository
        .createQueryBuilder('provider')
        .innerJoin('provider.categories', 'category')
        .where('category.id = :categoryId', { categoryId: category.id })
        .andWhere('provider.deletedAt IS NULL')
        .select(['provider.id', 'provider.languageCode'])
        .getMany();
      for (const provider of providers) {
        await this.notificationService.notifyLocalized({
          recipientId: provider.id,
          recipientType: NotificationRecipientType.PROVIDER,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          text: notificationTexts.categoryStatus(
            { ar: category.nameAr, en: category.nameEn },
            active,
          ),
          relatedEntityId: category.id,
          relatedEntityType: 'category',
        });
      }
    } catch (error) {
      this.logger.warn(
        `Category ${category.id} status changed but notifying providers failed: ${String(error)}`,
      );
    }
  }
}
