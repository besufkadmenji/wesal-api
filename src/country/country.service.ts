import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryInput } from './dto/create-country.input';
import { UpdateCountryInput } from './dto/update-country.input';
import type { LanguageCode } from '../../lib/i18n/language.types';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import { COUNTRY_ERROR_CODES } from './errors/country.error-codes';
import { COUNTRY_ERROR_MESSAGES } from './errors/country.error-messages';
import { CountryPaginationInput } from './dto/country-pagination.input';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(
    createCountryInput: CreateCountryInput,
    language: LanguageCode = 'en',
  ): Promise<Country> {
    // Check if country code already exists
    const existingCountry = await this.countryRepository.findOne({
      where: { code: createCountryInput.code },
    });

    if (existingCountry) {
      const message = I18nService.translate(
        COUNTRY_ERROR_MESSAGES[COUNTRY_ERROR_CODES.COUNTRY_ALREADY_EXISTS],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const country = this.countryRepository.create(createCountryInput);
    return this.countryRepository.save(country);
  }

  async findAll(
    paginationInput?: CountryPaginationInput,
  ): Promise<IPaginatedType<Country>> {
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

    const [items, total] = await this.countryRepository.findAndCount({
      skip,
      take: limit,
      order,
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Country> {
    const country = await this.countryRepository.findOneBy({ id });
    if (!country) {
      const message = I18nService.translate(
        COUNTRY_ERROR_MESSAGES[COUNTRY_ERROR_CODES.COUNTRY_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }
    return country;
  }

  async update(
    id: string,
    updateCountryInput: UpdateCountryInput,
    language: LanguageCode = 'en',
  ): Promise<Country> {
    const country = await this.findOne(id, language);

    // Check if new code is already taken
    if (updateCountryInput.code) {
      const conflictCountry = await this.countryRepository.findOne({
        where: { code: updateCountryInput.code },
      });

      if (conflictCountry && conflictCountry.id !== id) {
        const message = I18nService.translate(
          COUNTRY_ERROR_MESSAGES[COUNTRY_ERROR_CODES.CODE_ALREADY_IN_USE],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    Object.assign(country, updateCountryInput);
    return this.countryRepository.save(country);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Country> {
    const country = await this.findOne(id, language);
    return this.countryRepository.remove(country);
  }
}
