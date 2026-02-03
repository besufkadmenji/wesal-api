import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { I18nNotFoundException } from '../../lib/errors';
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

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly trackingService: TrackingService,
  ) {}

  async create(createCategoryInput: CreateCategoryInput): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryInput);
    return await this.categoryRepository.save(category);
  }

  async findAll(
    paginationInput: CategoryPaginationInput,
    userId?: string,
  ): Promise<IPaginatedType<Category>> {
    const { page = 1, limit = 10, search } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(category.nameEn ILIKE :search OR category.nameAr ILIKE :search OR category.descriptionEn ILIKE :search OR category.descriptionAr ILIKE :search)',
        { search: searchTerm },
      );
    }

    // If user is logged in, rank by their popular categories
    if (userId) {
      const popularCategories = await this.trackingService.getPopularCategories(
        userId,
        50,
      );
      const popularIds = popularCategories.map((p) => p.categoryId);

      if (popularIds.length > 0) {
        // Use CASE WHEN to prioritize popular categories
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

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Track views for logged-in users
    if (userId && items.length > 0) {
      // Track views asynchronously without blocking the response
      Promise.all(
        items.map((item) =>
          this.trackingService.trackAction(userId, {
            targetType: TargetType.CATEGORY,
            targetId: item.id,
            actionType: ActionType.VIEW,
          }),
        ),
      ).catch((err) => {
        // Log error but don't fail the request
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
    return await this.categoryRepository.save(category);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Category> {
    const category = await this.findOne(id, language);

    await this.categoryRepository
      .createQueryBuilder()
      .delete()
      .from('user_categories')
      .where('categoryId = :categoryId', { categoryId: id })
      .execute();

    await this.categoryRepository.delete({ id });
    return category;
  }
}
