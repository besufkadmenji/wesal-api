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

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    return this.cityRepository.save(city);
  }

  async findAll(
    paginationInput?: CityPaginationInput,
  ): Promise<IPaginatedType<City>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'DESC',
      search,
    } = paginationInput || {};

    const skip = (page - 1) * limit;

    const queryBuilder = this.cityRepository
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.country', 'country');

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.where(
        '(city.nameEn ILIKE :search OR city.nameAr ILIKE :search)',
        { search: searchTerm },
      );
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<City> {
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
    return city;
  }

  async findByCountry(
    countryId: string,
    paginationInput?: CityPaginationInput,
  ): Promise<IPaginatedType<City>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'DESC',
      search,
    } = paginationInput || {};

    const skip = (page - 1) * limit;

    const queryBuilder = this.cityRepository
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.country', 'country')
      .where('city.countryId = :countryId', { countryId });

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(city.nameEn ILIKE :search OR city.nameAr ILIKE :search)',
        { search: searchTerm },
      );
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
    const city = await this.findOne(id, language);

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
    return this.cityRepository.save(city);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<City> {
    const city = await this.findOne(id, language);

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

    await this.cityRepository.delete({ id });
    return city;
  }
}
