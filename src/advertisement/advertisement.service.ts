import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateAdvertisementInput } from './dto/create-advertisement.input';
import { UpdateAdvertisementInput } from './dto/update-advertisement.input';
import { AdvertisementPaginationInput } from './dto/advertisement-pagination.input';
import { Advertisement } from './entities/advertisement.entity';
import { User } from '../user/entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { City } from '../city/entities/city.entity';
import { ADVERTISEMENT_ERROR_MESSAGES } from './errors/advertisement.error-messages';

@Injectable()
export class AdvertisementService {
  constructor(
    @InjectRepository(Advertisement)
    private readonly advertisementRepository: Repository<Advertisement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  async create(
    createAdvertisementInput: CreateAdvertisementInput,
    language: LanguageCode = 'en',
  ): Promise<Advertisement> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createAdvertisementInput.userId },
    });
    if (!user) {
      const message = I18nService.translate(
        ADVERTISEMENT_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate category exists
    const category = await this.categoryRepository.findOne({
      where: { id: createAdvertisementInput.categoryId },
    });
    if (!category) {
      const message = I18nService.translate(
        ADVERTISEMENT_ERROR_MESSAGES['CATEGORY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate city exists
    const city = await this.cityRepository.findOne({
      where: { id: createAdvertisementInput.cityId },
    });
    if (!city) {
      const message = I18nService.translate(
        ADVERTISEMENT_ERROR_MESSAGES['CITY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate price
    if (createAdvertisementInput.price <= 0) {
      const message = I18nService.translate(
        ADVERTISEMENT_ERROR_MESSAGES['INVALID_PRICE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const advertisement = this.advertisementRepository.create(
      createAdvertisementInput,
    );
    return await this.advertisementRepository.save(advertisement);
  }

  async findAll(
    paginationInput: AdvertisementPaginationInput,
  ): Promise<IPaginatedType<Advertisement>> {
    const {
      page = 1,
      limit = 10,
      userId,
      categoryId,
      cityId,
      status,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.advertisementRepository
      .createQueryBuilder('advertisement')
      .leftJoinAndSelect('advertisement.user', 'user')
      .leftJoinAndSelect('advertisement.category', 'category')
      .leftJoinAndSelect('advertisement.city', 'city')
      .leftJoinAndSelect('advertisement.media', 'media')
      .leftJoinAndSelect('advertisement.attributes', 'attributes');

    if (userId) {
      queryBuilder.andWhere('advertisement.userId = :userId', { userId });
    }

    if (categoryId) {
      queryBuilder.andWhere('advertisement.categoryId = :categoryId', {
        categoryId,
      });
    }

    if (cityId) {
      queryBuilder.andWhere('advertisement.cityId = :cityId', { cityId });
    }

    if (status) {
      queryBuilder.andWhere('advertisement.status = :status', { status });
    }

    const orderByField = sortBy
      ? `advertisement.${sortBy}`
      : 'advertisement.createdAt';
    const orderDirection = sortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(orderByField, orderDirection)
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
    language: LanguageCode = 'en',
  ): Promise<Advertisement> {
    const advertisement = await this.advertisementRepository.findOne({
      where: { id },
      relations: ['user', 'category', 'city', 'media', 'attributes'],
    });

    if (!advertisement) {
      const message = I18nService.translate(
        ADVERTISEMENT_ERROR_MESSAGES['ADVERTISEMENT_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return advertisement;
  }

  async update(
    updateAdvertisementInput: UpdateAdvertisementInput,
    language: LanguageCode = 'en',
  ): Promise<Advertisement> {
    const advertisement = await this.findOne(
      updateAdvertisementInput.id,
      language,
    );

    // Validate category if being updated
    if (
      updateAdvertisementInput.categoryId &&
      updateAdvertisementInput.categoryId !== advertisement.categoryId
    ) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateAdvertisementInput.categoryId },
      });
      if (!category) {
        const message = I18nService.translate(
          ADVERTISEMENT_ERROR_MESSAGES['CATEGORY_NOT_FOUND'],
          language,
        );
        throw new I18nNotFoundException({ en: message, ar: message }, language);
      }
    }

    // Validate city if being updated
    if (
      updateAdvertisementInput.cityId &&
      updateAdvertisementInput.cityId !== advertisement.cityId
    ) {
      const city = await this.cityRepository.findOne({
        where: { id: updateAdvertisementInput.cityId },
      });
      if (!city) {
        const message = I18nService.translate(
          ADVERTISEMENT_ERROR_MESSAGES['CITY_NOT_FOUND'],
          language,
        );
        throw new I18nNotFoundException({ en: message, ar: message }, language);
      }
    }

    // Validate price if being updated
    if (
      updateAdvertisementInput.price !== undefined &&
      updateAdvertisementInput.price <= 0
    ) {
      const message = I18nService.translate(
        ADVERTISEMENT_ERROR_MESSAGES['INVALID_PRICE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    Object.assign(advertisement, updateAdvertisementInput);
    return await this.advertisementRepository.save(advertisement);
  }

  async remove(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Advertisement> {
    const advertisement = await this.findOne(id, language);
    await this.advertisementRepository.remove(advertisement);
    return advertisement;
  }
}
