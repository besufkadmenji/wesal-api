import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { Category } from '../category/entities/category.entity';
import { City } from '../city/entities/city.entity';
import { Complaint } from '../complaint/entities/complaint.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { Favorite } from '../favorite/entities/favorite.entity';
import { Provider } from '../provider/entities/provider.entity';
import { SignedContractStatus } from '../provider/enums/contract.enum';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { Rating } from '../rating/entities/rating.entity';
import { SearchService } from '../search/search.service';
import { ActionType } from '../tracking/enums/action-type.enum';
import { TargetType } from '../tracking/enums/target-type.enum';
import { TrackingService } from '../tracking/tracking.service';
import { CreateListingInput } from './dto/create-listing.input';
import { ListingPaginationInput } from './dto/listing-pagination.input';
import { PaginatedListingResponse } from './dto/paginated-listings.response';
import { UpdateListingInput } from './dto/update-listing.input';
import { CreateListingMediaInput } from './dto/create-listing-media.input';
import { Listing } from './entities/listing.entity';
import { MediaType } from './enums/media.enum';
import {
  ListingStatus,
  ListingType,
  PromotionStatus,
} from './enums/listing.enum';
import { LISTING_ERROR_CODES } from './errors/listing.error-codes';
import { LISTING_ERROR_MESSAGES } from './errors/listing.error-messages';
import { SettingService } from '../setting/setting.service';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    private readonly trackingService: TrackingService,
    private readonly searchService: SearchService,
    private readonly settingService: SettingService,
    private readonly paymentService: PaymentService,
  ) {}

  async create(
    createListingInput: CreateListingInput,
    providerId: string,
    language: LanguageCode = 'en',
  ): Promise<Listing> {
    await this.assertProviderCanPublish(providerId, language);
    this.assertVideoStory(createListingInput.story, language);

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
    const setting = await this.settingService.getSetting();
    const isFeatured = createListingInput.type === ListingType.FEATURED;
    if (isFeatured) {
      if (
        !setting.premiumAdEnabled ||
        Number(setting.premiumAdFee) <= 0 ||
        setting.premiumAdDurationDays < 1
      ) {
        throw new I18nBadRequestException(
          {
            en: 'Featured advertisements are disabled',
            ar: 'الإعلانات المميزة معطلة',
          },
          language,
        );
      }
    }
    const now = new Date();
    const featuredEndsAt = isFeatured
      ? new Date(now.getTime() + setting.premiumAdDurationDays * 86_400_000)
      : null;
    const listing = this.listingRepository.create({
      ...createListingInput,
      providerId,
      status: ListingStatus.ACTIVE,
      promotionStatus: isFeatured
        ? PromotionStatus.ACTIVE
        : PromotionStatus.NONE,
      promotionCycle: isFeatured ? 1 : 0,
      featuredStartsAt: isFeatured ? now : null,
      featuredEndsAt,
      story: createListingInput.story ?? null,
      photos: createListingInput.photos,
      tags: '',
    });

    const saved = await this.listingRepository.save(listing);
    if (isFeatured) {
      await this.paymentService.recordMockPremiumAdPayment(
        saved,
        Number(setting.premiumAdFee),
        setting.premiumAdDurationDays,
      );
    }
    // Index in Elasticsearch asynchronously
    this.searchService
      .indexListing(saved)
      .catch((err) => console.error('Failed to index listing in ES', err));
    return saved;
  }

  async findAll(
    paginationInput: ListingPaginationInput,
    userId?: string,
  ): Promise<PaginatedListingResponse> {
    const page = paginationInput.page ?? 1;
    const limit = paginationInput.limit ?? 10;
    const skip = (page - 1) * limit;
    const {
      status = ListingStatus.ACTIVE,
      type,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      categoryId,
      cityId,
      minPrice,
      maxPrice,
    } = paginationInput;

    let items: Listing[];
    let total: number;

    // Use Elasticsearch when a search term is present
    if (search && search.trim() && this.searchService.isEnabled) {
      const esResult = await this.searchService.searchListings(
        search.trim(),
        page,
        limit,
        {
          status,
          type,
          categoryId: categoryId ?? undefined,
          cityId: cityId ?? undefined,
          minPrice: minPrice ?? undefined,
          maxPrice: maxPrice ?? undefined,
        },
      );

      if (esResult.total > 0) {
        items = await this.searchService.loadListingsById(esResult.ids);
        total = esResult.total;
      } else {
        items = [];
        total = 0;
      }
    } else {
      // Fallback: Postgres query with optional popularity ranking
      let query = this.listingRepository.createQueryBuilder('listing');

      if (status) {
        query = query.where('listing.status = :status', { status });
      }

      if (type) {
        query = query.andWhere('listing.type = :type', { type });
      }

      if (search) {
        query = query.andWhere('listing.name ILIKE :search', {
          search: `%${search}%`,
        });
      }

      if (categoryId) {
        query = query.andWhere('listing.categoryId = :categoryId', {
          categoryId,
        });
      }

      if (cityId) {
        query = query.andWhere('listing.cityId = :cityId', { cityId });
      }

      if (minPrice) {
        query = query.andWhere('listing.price >= :minPrice', { minPrice });
      }

      if (maxPrice) {
        query = query.andWhere('listing.price <= :maxPrice', { maxPrice });
      }

      query = query
        .leftJoinAndSelect('listing.provider', 'provider')
        .leftJoinAndSelect('listing.category', 'category')
        .leftJoinAndSelect('listing.city', 'city');

      // BRD §4.2.10: Featured first, then badge tier (placeholder until badges exist),
      // then rating, sales, then requested sort.
      query.addSelect(
        `CASE WHEN listing.type = :featuredType THEN 0 ELSE 1 END`,
        'featured_rank',
      );
      query.setParameter('featuredType', ListingType.FEATURED);
      query.addSelect(
        `(SELECT COALESCE(AVG(r.rating), 0) FROM ratings r WHERE r."listingId" = listing.id)`,
        'rating_rank',
      );
      query.addSelect(
        `(SELECT COUNT(*)::int FROM contracts c WHERE c."listingId" = listing.id AND c.status = 'COMPLETED')`,
        'sales_rank',
      );
      query.orderBy('featured_rank', 'ASC');
      query.addOrderBy('rating_rank', 'DESC');
      query.addOrderBy('sales_rank', 'DESC');

      if (userId) {
        const popularListings = await this.trackingService.getPopularListings(
          userId,
          100,
        );
        const popularIds = popularListings.map((p) => p.listingId);

        if (popularIds.length > 0) {
          query.addSelect(
            `CASE WHEN listing.id IN (:...popularIds) THEN 0 ELSE 1 END`,
            'popularity_rank',
          );
          query.setParameter('popularIds', popularIds);
          query.addOrderBy('popularity_rank', 'ASC');
        }
      }
      query.addOrderBy(`listing.${sortBy}`, sortOrder);

      query.skip(skip).take(limit);
      [items, total] = await query.getManyAndCount();
    }

    const totalPages = Math.ceil(total / limit);

    // Track views for logged-in users
    if (userId && items.length > 0) {
      // Track views asynchronously without blocking the response
      Promise.all(
        items.map((item) =>
          this.trackingService.trackAction(userId, {
            targetType: TargetType.LISTING,
            targetId: item.id,
            actionType: ActionType.VIEW,
          }),
        ),
      ).catch((err) => {
        // Log error but don't fail the request
        console.error('Failed to track listing views:', err);
      });
    }

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
    userId?: string,
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['provider', 'category', 'city'],
    });

    if (!listing) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    // Track view for logged-in users
    if (userId) {
      this.trackingService
        .trackAction(userId, {
          targetType: TargetType.LISTING,
          targetId: id,
          actionType: ActionType.CLICK,
        })
        .catch((err) => {
          console.error('Failed to track listing view:', err);
        });
    }

    return listing;
  }

  @Interval(60_000)
  async expireFeaturedPromotions(): Promise<void> {
    const expired = await this.listingRepository.find({
      where: {
        promotionStatus: PromotionStatus.ACTIVE,
        featuredEndsAt: LessThanOrEqual(new Date()),
      },
    });
    for (const listing of expired) {
      const result = await this.listingRepository.update(
        { id: listing.id, promotionStatus: PromotionStatus.ACTIVE },
        {
          type: ListingType.FREE,
          status: ListingStatus.ACTIVE,
          promotionStatus: PromotionStatus.EXPIRED,
        },
      );
      if (result.affected === 1) {
        listing.type = ListingType.FREE;
        listing.status = ListingStatus.ACTIVE;
        listing.promotionStatus = PromotionStatus.EXPIRED;
        void this.searchService.indexListing(listing).catch(() => undefined);
      }
    }
  }

  async findOwnedOne(
    id: string,
    providerId: string,
    language: LanguageCode = 'en',
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['provider', 'category', 'city'],
    });
    if (!listing) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }
    if (listing.providerId !== providerId) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.UNAUTHORIZED],
        language,
      );
    }
    return listing;
  }

  async findByProvider(
    providerId: string,
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

    let query = this.listingRepository.createQueryBuilder('listing');

    query = query.where('listing.providerId = :providerId', { providerId });

    if (search) {
      query = query.andWhere('listing.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    query = query
      .leftJoinAndSelect('listing.category', 'category')
      .leftJoinAndSelect('listing.city', 'city')
      .orderBy(`listing.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
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
    providerId: string,
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
    if (listing.providerId !== providerId) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.UNAUTHORIZED],
        language,
      );
    }

    this.assertVideoStory(updateListingInput.story, language);

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

    // Publication and promotion state only change through the promotion/payment
    // lifecycle, never through a general provider update.
    const providerChanges = { ...updateListingInput };
    Reflect.deleteProperty(providerChanges, 'status');
    Reflect.deleteProperty(providerChanges, 'type');
    Reflect.deleteProperty(providerChanges, 'id');
    const updatedListing = this.listingRepository.merge(
      listing,
      providerChanges,
    );
    const saved = await this.listingRepository.save(updatedListing);
    // Keep Elasticsearch index in sync
    this.searchService
      .indexListing(saved)
      .catch((err) => console.error('Failed to update listing in ES', err));
    return saved;
  }

  async remove(
    id: string,
    language: LanguageCode = 'en',
    providerId?: string,
    adminId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const listing = await this.listingRepository.findOne({ where: { id } });

    if (!listing) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    // Check authorization
    if (listing.providerId !== providerId && !adminId) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.UNAUTHORIZED],
        language,
      );
    }

    const complaintCount = await this.complaintRepository.count({
      where: { listingId: id },
    });
    if (complaintCount > 0) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_HAS_COMPLAINTS],
        language,
      );
    }

    const conversationCount = await this.conversationRepository.count({
      where: { listingId: id },
    });
    if (conversationCount > 0) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_HAS_CONVERSATIONS],
        language,
      );
    }

    const ratingCount = await this.ratingRepository.count({
      where: { listingId: id },
    });
    if (ratingCount > 0) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_HAS_RATINGS],
        language,
      );
    }

    await this.listingRepository.remove(listing);
    // Remove from Elasticsearch index
    this.searchService
      .removeListing(id)
      .catch((err) => console.error('Failed to remove listing from ES', err));

    const successMessage =
      LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_DELETED];
    return {
      success: true,
      message: successMessage[language],
    };
  }

  async activate(
    id: string,
    language: LanguageCode = 'en',
    adminId: string,
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({ where: { id } });

    if (!listing) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    // Check authorization
    if (!adminId) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.UNAUTHORIZED],
        language,
      );
    }

    // Check if already active
    if (listing.status === ListingStatus.ACTIVE) {
      const message = I18nService.translate(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_ALREADY_ACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    listing.status = ListingStatus.ACTIVE;
    const saved = await this.listingRepository.save(listing);
    // Reflect status change in Elasticsearch
    this.searchService
      .indexListing(saved)
      .catch((err) =>
        console.error('Failed to update listing status in ES', err),
      );
    return saved;
  }

  async deactivate(
    id: string,
    reason: string,
    language: LanguageCode = 'en',
    adminId: string,
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({ where: { id } });

    if (!listing) {
      throw new I18nNotFoundException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_NOT_FOUND],
        language,
      );
    }

    // Check authorization
    if (!adminId) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.UNAUTHORIZED],
        language,
      );
    }

    // Check if already inactive
    if (listing.status === ListingStatus.INACTIVE) {
      const message = I18nService.translate(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.LISTING_ALREADY_INACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    listing.status = ListingStatus.INACTIVE;
    listing.deactivationReason = reason;
    const saved = await this.listingRepository.save(listing);
    // Reflect status change in Elasticsearch
    this.searchService
      .indexListing(saved)
      .catch((err) =>
        console.error('Failed to update listing status in ES', err),
      );
    return saved;
  }

  private async assertProviderCanPublish(
    providerId: string,
    language: LanguageCode,
  ): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
      relations: ['signedContract'],
    });
    if (!provider || provider.status !== ProviderStatus.ACTIVE) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.PROVIDER_NOT_ACTIVE],
        language,
      );
    }
    if (provider.signedContract?.status !== SignedContractStatus.ACTIVE) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.ACTIVE_CONTRACT_REQUIRED],
        language,
      );
    }
  }

  private assertVideoStory(
    story: CreateListingMediaInput | null | undefined,
    language: LanguageCode,
  ): void {
    if (story && story.type !== MediaType.VIDEO) {
      throw new I18nBadRequestException(
        LISTING_ERROR_MESSAGES[LISTING_ERROR_CODES.INVALID_STORY_TYPE],
        language,
      );
    }
  }
}
