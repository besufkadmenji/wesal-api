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
import { CreateRatingInput } from './dto/create-rating.input';
import { UpdateRatingInput } from './dto/update-rating.input';
import { RatingPaginationInput } from './dto/rating-pagination.input';
import { RatingStatistics } from './dto/rating-statistics.response';
import { Rating } from './entities/rating.entity';
import { User } from '../user/entities/user.entity';
import { RATING_ERROR_MESSAGES } from './errors/rating.error-messages';
import { Listing } from 'src/listing/entities/listing.entity';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  async create(
    createRatingInput: CreateRatingInput,
    language: LanguageCode = 'en',
  ): Promise<Rating> {
    // Validate rating value
    if (createRatingInput.rating < 1 || createRatingInput.rating > 5) {
      const message = I18nService.translate(
        RATING_ERROR_MESSAGES['INVALID_RATING_VALUE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createRatingInput.userId },
    });
    if (!user) {
      const message = I18nService.translate(
        RATING_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate listing exists
    const listing = await this.listingRepository.findOne({
      where: { id: createRatingInput.listingId },
    });
    if (!listing) {
      const message = I18nService.translate(
        RATING_ERROR_MESSAGES['LISTING_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check for duplicate rating
    const existingRating = await this.ratingRepository.findOne({
      where: {
        userId: createRatingInput.userId,
        listingId: createRatingInput.listingId,
      },
    });

    if (existingRating) {
      const message = I18nService.translate(
        RATING_ERROR_MESSAGES['DUPLICATE_RATING'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const rating = this.ratingRepository.create(createRatingInput);
    return await this.ratingRepository.save(rating);
  }

  async findAll(
    paginationInput: RatingPaginationInput,
  ): Promise<IPaginatedType<Rating>> {
    const {
      page = 1,
      limit = 10,
      userId,
      listingId,
      minRating,
      maxRating,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.user', 'user')
      .leftJoinAndSelect('rating.listing', 'listing');

    if (userId) {
      queryBuilder.andWhere('rating.userId = :userId', { userId });
    }

    if (listingId) {
      queryBuilder.andWhere('rating.listingId = :listingId', {
        listingId,
      });
    }

    if (minRating !== undefined) {
      queryBuilder.andWhere('rating.rating >= :minRating', { minRating });
    }

    if (maxRating !== undefined) {
      queryBuilder.andWhere('rating.rating <= :maxRating', { maxRating });
    }

    const orderByField = sortBy ? `rating.${sortBy}` : 'rating.createdAt';
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Rating> {
    const rating = await this.ratingRepository.findOne({
      where: { id },
      relations: ['user', 'listing'],
    });

    if (!rating) {
      const message = I18nService.translate(
        RATING_ERROR_MESSAGES['RATING_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return rating;
  }

  async update(
    updateRatingInput: UpdateRatingInput,
    language: LanguageCode = 'en',
  ): Promise<Rating> {
    const rating = await this.findOne(updateRatingInput.id, language);

    // Validate rating value if being updated
    if (
      updateRatingInput.rating !== undefined &&
      (updateRatingInput.rating < 1 || updateRatingInput.rating > 5)
    ) {
      const message = I18nService.translate(
        RATING_ERROR_MESSAGES['INVALID_RATING_VALUE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    Object.assign(rating, updateRatingInput);
    return await this.ratingRepository.save(rating);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Rating> {
    const rating = await this.findOne(id, language);
    await this.ratingRepository.remove(rating);
    return rating;
  }

  async getStatistics(listingId: string): Promise<RatingStatistics> {
    const ratings = await this.ratingRepository.find({
      where: { listingId },
    });

    const totalRatings = ratings.length;
    if (totalRatings === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
      };
    }

    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = sum / totalRatings;

    const fiveStars = ratings.filter((r) => r.rating === 5).length;
    const fourStars = ratings.filter((r) => r.rating === 4).length;
    const threeStars = ratings.filter((r) => r.rating === 3).length;
    const twoStars = ratings.filter((r) => r.rating === 2).length;
    const oneStar = ratings.filter((r) => r.rating === 1).length;

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      fiveStars,
      fourStars,
      threeStars,
      twoStars,
      oneStar,
    };
  }
}
