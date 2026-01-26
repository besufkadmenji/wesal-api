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
import { CreateFavoriteInput } from './dto/create-favorite.input';
import { FavoritePaginationInput } from './dto/favorite-pagination.input';
import { Favorite } from './entities/favorite.entity';
import { User } from '../user/entities/user.entity';
import { Listing } from '../listing/entities/listing.entity';
import { FAVORITE_ERROR_MESSAGES } from './errors/favorite.error-messages';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  async create(
    createFavoriteInput: CreateFavoriteInput,
    language: LanguageCode = 'en',
  ): Promise<Favorite> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createFavoriteInput.userId },
    });
    if (!user) {
      const message = I18nService.translate(
        FAVORITE_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate listing exists
    const listing = await this.listingRepository.findOne({
      where: { id: createFavoriteInput.listingId },
    });
    if (!listing) {
      const message = I18nService.translate(
        FAVORITE_ERROR_MESSAGES['LISTING_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check for duplicate favorite
    const existingFavorite = await this.favoriteRepository.findOne({
      where: {
        userId: createFavoriteInput.userId,
        listingId: createFavoriteInput.listingId,
      },
    });

    if (existingFavorite) {
      const message = I18nService.translate(
        FAVORITE_ERROR_MESSAGES['DUPLICATE_FAVORITE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const favorite = this.favoriteRepository.create(createFavoriteInput);
    return await this.favoriteRepository.save(favorite);
  }

  async findAll(
    paginationInput: FavoritePaginationInput,
  ): Promise<IPaginatedType<Favorite>> {
    const {
      page = 1,
      limit = 10,
      userId,
      listingId,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.favoriteRepository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.user', 'user')
      .leftJoinAndSelect('favorite.listing', 'listing');

    if (userId) {
      queryBuilder.andWhere('favorite.userId = :userId', { userId });
    }

    if (listingId) {
      queryBuilder.andWhere('favorite.listingId = :listingId', {
        listingId,
      });
    }

    const orderByField = sortBy ? `favorite.${sortBy}` : 'favorite.createdAt';
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Favorite> {
    const favorite = await this.favoriteRepository.findOne({
      where: { id },
      relations: ['user', 'listing'],
    });

    if (!favorite) {
      const message = I18nService.translate(
        FAVORITE_ERROR_MESSAGES['FAVORITE_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return favorite;
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Favorite> {
    const favorite = await this.findOne(id, language);
    await this.favoriteRepository.remove(favorite);
    return favorite;
  }

  async removeByUserAndListing(
    userId: string,
    listingId: string,
    language: LanguageCode = 'en',
  ): Promise<Favorite> {
    const favorite = await this.favoriteRepository.findOne({
      where: {
        userId,
        listingId,
      },
      relations: ['user', 'listing'],
    });

    if (!favorite) {
      const message = I18nService.translate(
        FAVORITE_ERROR_MESSAGES['FAVORITE_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    await this.favoriteRepository.remove(favorite);
    return favorite;
  }

  async isFavorite(userId: string, listingId: string): Promise<boolean> {
    const count = await this.favoriteRepository.count({
      where: {
        userId,
        listingId,
      },
    });
    return count > 0;
  }
}
