import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CityPaginationInput } from './dto/city-pagination.input';
import { CreateCityInput } from './dto/create-city.input';
import { UpdateCityInput } from './dto/update-city.input';
import { City } from './entities/city.entity';
import { CITY_ERROR_CODES } from './errors/city.error-codes';
import { CITY_ERROR_MESSAGES } from './errors/city.error-messages';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { CityStatus } from './enum/city.enum';
import { ProviderStatus } from '../provider/enums/provider-status.enum';

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
  ) {}

  async create(
    createCityInput: CreateCityInput,
    language: LanguageCode = 'en',
  ): Promise<City> {
    // Check if city with same name exists in the same country
    const existingCity = await this.cityRepository.findOne({
      where: {
        nameEn: createCityInput.nameEn,
        countryId: createCityInput.countryId,
      },
    });

    if (existingCity) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_ALREADY_EXISTS],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const city = this.cityRepository.create(createCityInput);
    await this.cityRepository.save(city);
    return this.findOne(city.id, language);
  }

  async findAll(
    paginationInput?: CityPaginationInput,
    isAdmin?: boolean,
  ): Promise<IPaginatedType<City>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'DESC',
      search,
      status,
    } = paginationInput || {};

    const skip = (page - 1) * limit;

    // Non-admins can only see active cities unless an explicit status filter is set by admin
    const effectiveStatus = isAdmin ? status : (status ?? CityStatus.ACTIVE);

    const queryBuilder = this.cityRepository
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.country', 'country')
      .where('1=1');

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(city.nameEn ILIKE :search OR city.nameAr ILIKE :search OR "city"."publicId"::text ILIKE :search)',
        { search: searchTerm },
      );
    }
    if (effectiveStatus) {
      queryBuilder.andWhere('city.status = :status', {
        status: effectiveStatus,
      });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(sortBy ? `city.${sortBy}` : 'city.createdAt', sortOrder)
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
    isAdmin?: boolean,
  ): Promise<City> {
    const city = await this.cityRepository.findOne({
      where: { id },
      relations: ['country'],
    });

    if (!city) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Non-admins cannot see inactive cities
    if (!isAdmin && city.status !== CityStatus.ACTIVE) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return city;
  }

  async findByCountry(
    countryId: string,
    paginationInput?: CityPaginationInput,
    isAdmin?: boolean,
  ): Promise<IPaginatedType<City>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'DESC',
      search,
      status,
    } = paginationInput || {};

    const skip = (page - 1) * limit;

    // Non-admins can only see active cities
    const effectiveStatus = isAdmin ? status : (status ?? CityStatus.ACTIVE);

    const queryBuilder = this.cityRepository
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.country', 'country')
      .where('city.countryId = :countryId', { countryId });

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(city.nameEn ILIKE :search OR city.nameAr ILIKE :search OR "city"."publicId"::text ILIKE :search)',
        { search: searchTerm },
      );
    }

    if (effectiveStatus) {
      queryBuilder.andWhere('city.status = :status', {
        status: effectiveStatus,
      });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(sortBy ? `city.${sortBy}` : 'city.createdAt', sortOrder)
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

  async update(
    id: string,
    updateCityInput: UpdateCityInput,
    language: LanguageCode = 'en',
  ): Promise<City> {
    const city = await this.findOne(id, language, true);

    // Check if new name conflicts with another city in the same country
    if (updateCityInput.nameEn || updateCityInput.countryId) {
      const conflictCity = await this.cityRepository.findOne({
        where: {
          nameEn: updateCityInput.nameEn || city.nameEn,
          countryId: updateCityInput.countryId || city.countryId,
        },
      });

      if (conflictCity && conflictCity.id !== id) {
        const message = I18nService.translate(
          CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_ALREADY_EXISTS],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    Object.assign(city, updateCityInput);
    await this.cityRepository.save(city);
    return this.findOne(id, language);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<City> {
    const city = await this.findOne(id, language, true);

    // Check if any users are using this city
    const userCount = await this.userRepository.count({
      where: { cityId: id },
    });

    if (userCount > 0) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_IN_USE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const providerCount = await this.providerRepository.count({
      where: { cityId: id },
    });
    if (providerCount > 0) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_IN_USE_BY_PROVIDERS],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    await this.cityRepository.delete({ id });
    return city;
  }

  async activate(id: string, language: LanguageCode = 'en'): Promise<City> {
    const city = await this.cityRepository.findOne({ where: { id } });

    if (!city) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    if (city.status === CityStatus.ACTIVE) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_ALREADY_ACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    city.status = CityStatus.ACTIVE;
    return this.cityRepository.save(city);
  }

  async deactivate(id: string, language: LanguageCode = 'en'): Promise<City> {
    const city = await this.cityRepository.findOne({ where: { id } });

    if (!city) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    if (city.status === CityStatus.INACTIVE) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_ALREADY_INACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Prevent deactivating a city that has active providers
    const activeProviderCount = await this.providerRepository.count({
      where: { cityId: id, status: ProviderStatus.ACTIVE },
    });

    if (activeProviderCount > 0) {
      const message = I18nService.translate(
        CITY_ERROR_MESSAGES[CITY_ERROR_CODES.CITY_HAS_ACTIVE_PROVIDERS],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    city.status = CityStatus.INACTIVE;
    return this.cityRepository.save(city);
  }
}
