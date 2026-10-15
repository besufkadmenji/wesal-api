import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { NotificationService } from '../notification/notification.service';
import { ListingReviewsInput } from './dto/listing-reviews.input';
import { ListingReview } from './dto/listing-review.response';
import {
  RATING_COMMENT_MAX_LENGTH,
  RateContractInput,
} from './dto/rate-contract.input';
import { RatingPaginationInput } from './dto/rating-pagination.input';
import { RatingStatistics } from './dto/rating-statistics.response';
import { Rating } from './entities/rating.entity';
import { RatingStatus } from './enums/rating-status.enum';
import { RATING_ERROR_CODES } from './errors/rating.error-codes';
import { RATING_ERROR_MESSAGES } from './errors/rating.error-messages';

/** Letters/marks/digits in any script, whitespace and basic punctuation (D-10). */
const COMMENT_PATTERN = /^[\p{L}\p{M}\p{N}\s.,!?؟،؛:;'"()-]*$/u;

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly notificationService?: NotificationService,
  ) {}

  /** Customer rates their own completed contract — once (BRD 4.1.20.1). */
  async rateContract(
    input: RateContractInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Rating> {
    if (principal.type !== 'user')
      throw this.error('UNAUTHORIZED_ACCESS', language);
    if (
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    ) {
      throw this.error('INVALID_RATING_VALUE', language);
    }
    const comment = this.normalizeComment(input.comment, language);

    const saved = await this.dataSource.transaction(async (manager) => {
      const contract = await manager
        .getRepository(Contract)
        .createQueryBuilder('contract')
        .setLock('pessimistic_write')
        .where('contract.id = :id', { id: input.contractId })
        .getOne();
      if (!contract) throw this.notFound('CONTRACT_NOT_FOUND', language);
      if (contract.clientId !== principal.sub) {
        throw this.error('UNAUTHORIZED_ACCESS', language);
      }
      if (contract.status !== ContractStatus.COMPLETED) {
        throw this.error('CONTRACT_NOT_COMPLETED', language);
      }
      const ratings = manager.getRepository(Rating);
      if (await ratings.exists({ where: { contractId: contract.id } })) {
        throw this.error('DUPLICATE_RATING', language);
      }
      const rating = await ratings.save(
        ratings.create({
          userId: contract.clientId,
          listingId: contract.listingId,
          providerId: contract.providerId,
          contractId: contract.id,
          rating: input.rating,
          comment,
          status: RatingStatus.PUBLISHED,
          isSystemGenerated: false,
        }),
      );
      await this.recalculate(manager, contract.listingId, contract.providerId);
      return { rating, contract };
    });

    await this.notifyProvider(saved.rating, saved.contract, language);
    return this.load(saved.rating.id, language);
  }

  findForContract(contractId: string): Promise<Rating | null> {
    return this.ratingRepository.findOne({ where: { contractId } });
  }

  /** Public, published-only reviews for a listing; no reviewer contact data. */
  async listingReviews(
    input: ListingReviewsInput,
  ): Promise<IPaginatedType<ListingReview>> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const [ratings, total] = await this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.user', 'user')
      .where('rating.listingId = :listingId', { listingId: input.listingId })
      .andWhere('rating.status = :status', { status: RatingStatus.PUBLISHED })
      .orderBy('rating.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return this.paginate(
      ratings.map((rating) => ({
        id: rating.id,
        rating: rating.rating,
        comment: rating.comment,
        reviewerName: rating.user?.name ?? null,
        reviewerAvatarFilename: rating.user?.avatarFilename ?? null,
        createdAt: rating.createdAt,
      })),
      total,
      page,
      limit,
    );
  }

  /** Admin comments management list (BRD 4.3.19). */
  async findAdmin(
    input: RatingPaginationInput,
  ): Promise<IPaginatedType<Rating>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      listingId,
      providerId,
      minRating,
      maxRating,
      from,
      to,
      sortBy,
      sortOrder = SortOrder.DESC,
    } = input;
    const query = this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.user', 'user')
      .leftJoinAndSelect('rating.listing', 'listing')
      .leftJoinAndSelect('rating.provider', 'provider')
      .leftJoinAndSelect('rating.contract', 'contract');
    if (status) query.andWhere('rating.status = :status', { status });
    if (listingId)
      query.andWhere('rating.listingId = :listingId', { listingId });
    if (providerId) {
      query.andWhere('rating.providerId = :providerId', { providerId });
    }
    if (minRating !== undefined) {
      query.andWhere('rating.rating >= :minRating', { minRating });
    }
    if (maxRating !== undefined) {
      query.andWhere('rating.rating <= :maxRating', { maxRating });
    }
    if (from) query.andWhere('rating.createdAt >= :from', { from });
    if (to) query.andWhere('rating.createdAt <= :to', { to });
    if (search?.trim()) {
      query.andWhere(
        `(user.name ILIKE :search
          OR user.phone ILIKE :search
          OR contract."publicId"::text ILIKE :search
          OR listing.name ILIKE :search
          OR provider."commercialName" ILIKE :search)`,
        { search: `%${search.trim()}%` },
      );
    }
    const [items, total] = await query
      .orderBy(
        `rating.${sortBy ?? 'createdAt'}`,
        sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
      )
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return this.paginate(items, total, page, limit);
  }

  /** Publish or hide a rating; hidden ratings leave the averages (BRD 4.3.19). */
  async setStatus(
    id: string,
    status: RatingStatus,
    admin: AdminJwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Rating> {
    await this.dataSource.transaction(async (manager) => {
      const ratings = manager.getRepository(Rating);
      const rating = await ratings
        .createQueryBuilder('rating')
        .setLock('pessimistic_write')
        .where('rating.id = :id', { id })
        .getOne();
      if (!rating) throw this.notFound('RATING_NOT_FOUND', language);
      if (rating.status === status) return;
      rating.status = status;
      rating.moderatedAt = new Date();
      rating.moderatedByAdminId = admin.sub;
      await ratings.save(rating);
      await this.recalculate(manager, rating.listingId, rating.providerId);
    });
    return this.load(id, language);
  }

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Rating> {
    return this.load(id, language);
  }

  /** Star distribution for a listing; published ratings only. */
  async getStatistics(listingId: string): Promise<RatingStatistics> {
    const rows = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('rating.rating', 'stars')
      .addSelect('COUNT(*)::int', 'count')
      .where('rating.listingId = :listingId', { listingId })
      .andWhere('rating.status = :status', { status: RatingStatus.PUBLISHED })
      .groupBy('rating.rating')
      .getRawMany<{ stars: number; count: number }>();
    const countOf = (stars: number) =>
      rows.find((row) => Number(row.stars) === stars)?.count ?? 0;
    const totalRatings = rows.reduce((sum, row) => sum + row.count, 0);
    const sum = rows.reduce(
      (acc, row) => acc + Number(row.stars) * row.count,
      0,
    );
    return {
      averageRating: totalRatings
        ? Math.round((sum / totalRatings) * 100) / 100
        : 0,
      totalRatings,
      fiveStars: countOf(5),
      fourStars: countOf(4),
      threeStars: countOf(3),
      twoStars: countOf(2),
      oneStar: countOf(1),
    };
  }

  /**
   * Refresh cached aggregates. Listing average = mean of its published
   * ratings; provider average = mean of its rated listings' averages
   * (BRD 4.3.18). Must run inside the transaction that changed ratings.
   */
  async recalculate(
    manager: EntityManager,
    listingId: string,
    providerId: string,
  ): Promise<void> {
    await manager.query(
      `UPDATE "listings" l
       SET "ratingAverage" = COALESCE(stats.average, 0),
           "ratingCount" = COALESCE(stats.total, 0)
       FROM (
         SELECT ROUND(AVG(r.rating)::numeric, 2) AS average, COUNT(*)::int AS total
         FROM "ratings" r
         WHERE r."listingId" = $1 AND r.status = $2
       ) stats
       WHERE l.id = $1`,
      [listingId, RatingStatus.PUBLISHED],
    );
    await manager.query(
      `UPDATE "providers" p
       SET "ratingAverage" = COALESCE(stats.average, 0),
           "ratingCount" = COALESCE(stats.total, 0)
       FROM (
         SELECT ROUND(AVG(l."ratingAverage"), 2) AS average,
                SUM(l."ratingCount")::int AS total
         FROM "listings" l
         WHERE l."providerId" = $1 AND l."ratingCount" > 0
       ) stats
       WHERE p.id = $1`,
      [providerId],
    );
  }

  private normalizeComment(
    comment: string | undefined,
    language: LanguageCode,
  ): string | null {
    const trimmed = comment?.trim();
    if (!trimmed) return null;
    if (
      trimmed.length > RATING_COMMENT_MAX_LENGTH ||
      !COMMENT_PATTERN.test(trimmed)
    ) {
      throw this.error('INVALID_COMMENT', language);
    }
    return trimmed;
  }

  private async notifyProvider(
    rating: Rating,
    contract: Contract,
    language: LanguageCode,
  ): Promise<void> {
    if (!this.notificationService) return;
    const reference = contract.publicId ?? contract.id;
    try {
      await this.notificationService.createForRecipient({
        recipientId: rating.providerId,
        recipientType: NotificationRecipientType.PROVIDER,
        type: NotificationType.NEW_RATING,
        title: language === 'ar' ? 'تقييم جديد' : 'New rating',
        message:
          language === 'ar'
            ? `تم تقييم التعاقد رقم ${reference} بـ ${rating.rating} من 5`
            : `Contract ${reference} was rated ${rating.rating} out of 5`,
        relatedEntityId: contract.id,
        relatedEntityType: 'contract',
      });
    } catch (error) {
      this.logger.warn(
        `Rating persisted but notification failed: ${String(error)}`,
      );
    }
  }

  private async load(id: string, language: LanguageCode): Promise<Rating> {
    const rating = await this.ratingRepository.findOne({
      where: { id },
      relations: ['user', 'listing', 'provider', 'contract'],
    });
    if (!rating) throw this.notFound('RATING_NOT_FOUND', language);
    return rating;
  }

  private paginate<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): IPaginatedType<T> {
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

  private message(
    code: keyof typeof RATING_ERROR_CODES,
    language: LanguageCode,
  ): string {
    return I18nService.translate(
      RATING_ERROR_MESSAGES[RATING_ERROR_CODES[code]],
      language,
    );
  }

  private error(
    code: keyof typeof RATING_ERROR_CODES,
    language: LanguageCode,
  ): I18nBadRequestException {
    const message = this.message(code, language);
    return new I18nBadRequestException({ en: message, ar: message }, language);
  }

  private notFound(
    code: keyof typeof RATING_ERROR_CODES,
    language: LanguageCode,
  ): I18nNotFoundException {
    const message = this.message(code, language);
    return new I18nNotFoundException({ en: message, ar: message }, language);
  }
}
