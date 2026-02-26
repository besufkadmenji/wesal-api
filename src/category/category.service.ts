import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { Category } from './entities/category.entity';
import { CATEGORY_ERROR_MESSAGES } from './errors/category.error-messages';
import { TrackingService } from '../tracking/tracking.service';
import { TargetType } from '../tracking/enums/target-type.enum';
import { ActionType } from '../tracking/enums/action-type.enum';
import { CategoryStatus } from './enum/category.enum';
import { SearchService } from '../search/search.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    private readonly trackingService: TrackingService,
    private readonly searchService: SearchService,
  ) {}

  async create(createCategoryInput: CreateCategoryInput): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryInput);
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
  ): Promise<IPaginatedType<Category>> {
    const { page = 1, limit = 10, search, status } = paginationInput;
    const skip = (page - 1) * limit;

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
        items = status ? loaded.filter((c) => c.status === status) : loaded;
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

      if (status) {
        queryBuilder.andWhere('category.status = :status', { status });
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
    const saved = await this.categoryRepository.save(category);
    // Keep Elasticsearch index in sync
    this.searchService
      .indexCategory(saved)
      .catch((err) => console.error('Failed to update category in ES', err));
    return saved;
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Category> {
    const category = await this.findOne(id, language);

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

    category.status = CategoryStatus.INACTIVE;
    const saved = await this.categoryRepository.save(category);
    this.searchService
      .indexCategory(saved)
      .catch((err) =>
        console.error('Failed to update category status in ES', err),
      );
    return saved;
  }
}
