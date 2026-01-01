import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { CreateCityInput } from './dto/create-city.input';
import { UpdateCityInput } from './dto/update-city.input';
import type { LanguageCode } from '../../lib/i18n/language.types';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import { CITY_ERROR_CODES } from './errors/city.error-codes';
import { CITY_ERROR_MESSAGES } from './errors/city.error-messages';
import { CityPaginationInput } from './dto/city-pagination.input';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  async create(
    createCityInput: CreateCityInput,
    language: LanguageCode = 'en',
  ): Promise<City> {
    // Check if city with same name exists in the same country
    const existingCity = await this.cityRepository.findOne({
      where: {
        name: createCityInput.name,
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
      sortOrder = 'ASC',
    } = paginationInput || {};

    const skip = (page - 1) * limit;
    const order: {
      [key: string]: 'ASC' | 'DESC';
    } = sortBy ? { [sortBy]: sortOrder } : { name: 'ASC' };

    const [items, total] = await this.cityRepository.findAndCount({
      skip,
      take: limit,
      order,
      relations: ['country'],
    });

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
      sortOrder = 'ASC',
    } = paginationInput || {};

    const skip = (page - 1) * limit;
    const order: {
      [key: string]: 'ASC' | 'DESC';
    } = sortBy ? { [sortBy]: sortOrder } : { name: 'ASC' };

    const [items, total] = await this.cityRepository.findAndCount({
      where: { countryId },
      skip,
      take: limit,
      order,
      relations: ['country'],
    });

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
    if (updateCityInput.name || updateCityInput.countryId) {
      const conflictCity = await this.cityRepository.findOne({
        where: {
          name: updateCityInput.name || city.name,
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
    return this.cityRepository.remove(city);
  }
}
