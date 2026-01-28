import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { Category } from '../category/entities/category.entity';
import { City } from '../city/entities/city.entity';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user-role.enum';
import { CreateListingInput } from './dto/create-listing.input';
import { ListingPaginationInput } from './dto/listing-pagination.input';
import { PaginatedListingResponse } from './dto/paginated-listings.response';
import { UpdateListingInput } from './dto/update-listing.input';
import { Listing } from './entities/listing.entity';
import { ListingStatus } from './enums/listing.enum';
import { LISTING_ERROR_CODES } from './errors/listing.error-codes';
import { LISTING_ERROR_MESSAGES } from './errors/listing.error-messages';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  async create(
    createListingInput: CreateListingInput,
    userId: string,
    language: LanguageCode = 'en',
  ): Promise<Listing> {
    // Check if user is a provider
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    if (user.role !== UserRole.PROVIDER) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.PROVIDER_ONLY],
        language,
      );
    }

    // Validate category exists
    const category = await this.categoryRepository.findOne({
      where: { id: createListingInput.categoryId },
    });
    if (!category) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.CATEGORY_NOT_FOUND],
        language,
      );
    }

    // Validate city exists
    const city = await this.cityRepository.findOne({
      where: { id: createListingInput.cityId },
    });
    if (!city) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.CITY_NOT_FOUND],
        language,
      );
    }
    // Create listing
    const listing = this.listingRepository.create({
      ...createListingInput,
      userId,
      status: createListingInput.status || ListingStatus.DRAFT,
      story: createListingInput.story,
      photos: createListingInput.photos,
      tags: '',
    });

    return this.listingRepository.save(listing);
  }

  async findAll(
    paginationInput: ListingPaginationInput,
  ): Promise<PaginatedListingResponse> {
    const page = paginationInput.page ?? 1;
    const limit = paginationInput.limit ?? 10;
    const skip = (page - 1) * limit;
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
    } = paginationInput;

    const [items, total] = await this.listingRepository.findAndCount({
      where: {
        status: status || ListingStatus.PUBLISHED,
        ...(search ? { name: ILike(`%${search}%`) } : {}),
      },
      skip,
      take: limit,
      relations: ['user', 'category', 'city'],
      order: { [sortBy]: sortOrder },
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['user', 'category', 'city'],
    });

    if (!listing) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    return listing;
  }

  async findByUser(
    userId: string,
    paginationInput: ListingPaginationInput,
  ): Promise<PaginatedListingResponse> {
    const page = paginationInput.page ?? 1;
    const limit = paginationInput.limit ?? 10;
    const skip = (page - 1) * limit;
    const {
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
    } = paginationInput;

    const [items, total] = await this.listingRepository.findAndCount({
      where: {
        userId,
        ...(search ? { name: ILike(`%${search}%`) } : {}),
      },
      skip,
      take: limit,
      relations: ['category', 'city'],
      order: { [sortBy]: sortOrder },
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
    updateListingInput: UpdateListingInput,
    userId: string,
    language: LanguageCode = 'en',
  ): Promise<Listing> {
    // Find listing
    const listing = await this.listingRepository.findOne({ where: { id } });
    if (!listing) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    // Check authorization
    if (listing.userId !== userId) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.UNAUTHORIZED],
        language,
      );
    }

    // Validate category if provided
    if (updateListingInput.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateListingInput.categoryId },
      });
      if (!category) {
        throw new I18nNotFoundException(
          LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.CATEGORY_NOT_FOUND],
          language,
        );
      }
    }

    // Validate city if provided
    if (updateListingInput.cityId) {
      const city = await this.cityRepository.findOne({
        where: { id: updateListingInput.cityId },
      });
      if (!city) {
        throw new I18nNotFoundException(
          LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.CITY_NOT_FOUND],
          language,
        );
      }
    }

    // Update listing
    const updatedListing = this.listingRepository.merge(
      listing,
      updateListingInput,
    );
    return this.listingRepository.save(updatedListing);
  }

  async remove(
    id: string,
    userId: string,
    language: LanguageCode = 'en',
  ): Promise<{ success: boolean; message: string }> {
    const listing = await this.listingRepository.findOne({ where: { id } });

    if (!listing) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    // Check authorization
    if (listing.userId !== userId) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.UNAUTHORIZED],
        language,
      );
    }

    await this.listingRepository.remove(listing);

    const successMessage =
      LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_DELETED];
    return {
      success: true,
      message: successMessage[language],
    };
  }
}
