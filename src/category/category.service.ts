import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(
    createCategoryInput: CreateCategoryInput,
    language: LanguageCode = 'en',
  ): Promise<Category> {
    // If parentId is provided, verify it exists
    if (createCategoryInput.parentId) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: createCategoryInput.parentId },
      });

      if (!parentCategory) {
        const message = I18nService.translate(
          CATEGORY_ERROR_MESSAGES['PARENT_CATEGORY_NOT_FOUND'],
          language,
        );
        throw new I18nNotFoundException({ en: message, ar: message }, language);
      }
    }

    const category = this.categoryRepository.create(createCategoryInput);
    return await this.categoryRepository.save(category);
  }

  async findAll(
    paginationInput: CategoryPaginationInput,
  ): Promise<IPaginatedType<Category>> {
    const { page = 1, limit = 10, parentId, search } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children');

    // Filter by parentId if provided, or get root categories
    if (parentId !== undefined) {
      if (parentId === null) {
        queryBuilder.where('category.parentId IS NULL');
      } else {
        queryBuilder.where('category.parentId = :parentId', { parentId });
      }
    }

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(category.nameEn ILIKE :search OR category.nameAr ILIKE :search OR category.descriptionEn ILIKE :search OR category.descriptionAr ILIKE :search)',
        { search: searchTerm },
      );
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('category.createdAt', 'DESC')
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      const message = I18nService.translate(
        CATEGORY_ERROR_MESSAGES['CATEGORY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
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

    // Validate parentId if provided
    if (updateCategoryInput.parentId !== undefined) {
      // Check if trying to set itself as parent
      if (updateCategoryInput.parentId === updateCategoryInput.id) {
        const message = I18nService.translate(
          CATEGORY_ERROR_MESSAGES['INVALID_PARENT_CATEGORY'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // If parentId is not null, verify it exists
      if (updateCategoryInput.parentId !== null) {
        const parentCategory = await this.categoryRepository.findOne({
          where: { id: updateCategoryInput.parentId },
        });

        if (!parentCategory) {
          const message = I18nService.translate(
            CATEGORY_ERROR_MESSAGES['PARENT_CATEGORY_NOT_FOUND'],
            language,
          );
          throw new I18nNotFoundException(
            { en: message, ar: message },
            language,
          );
        }
      }
    }

    Object.assign(category, updateCategoryInput);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Category> {
    const category = await this.findOne(id, language);
    await this.categoryRepository.remove(category);
    return category;
  }
}
