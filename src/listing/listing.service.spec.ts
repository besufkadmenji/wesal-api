/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
import { SCHEDULE_INTERVAL_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { SignedContractStatus } from '../provider/enums/contract.enum';
import {
  ListingStatus,
  ListingType,
  PromotionStatus,
} from './enums/listing.enum';
import { MediaType } from './enums/media.enum';
import { ListingService } from './listing.service';
import { CategoryStatus } from '../category/enum/category.enum';

describe('ListingService provider finalization', () => {
  const listingRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    create: jest.fn((value) => value),
    merge: jest.fn((target, value) => ({ ...target, ...value })),
    save: jest
      .fn()
      .mockImplementation((value) =>
        Promise.resolve({ id: 'listing-id', ...value }),
      ),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
  };
  const providerRepository = { findOne: jest.fn() };
  const categoryRepository = { findOne: jest.fn() };
  const cityRepository = { findOne: jest.fn() };
  const searchService = {
    isEnabled: false,
    indexListing: jest.fn().mockResolvedValue(undefined),
  };
  const settingService = { getSetting: jest.fn() };
  const service = new ListingService(
    listingRepository as never,
    providerRepository as never,
    categoryRepository as never,
    cityRepository as never,
    { count: jest.fn() } as never,
    { count: jest.fn() } as never,
    { count: jest.fn() } as never,
    { count: jest.fn() } as never,
    { trackAction: jest.fn(), getPopularListings: jest.fn() } as never,
    searchService as never,
    settingService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    providerRepository.findOne.mockResolvedValue({
      id: 'provider-id',
      status: ProviderStatus.ACTIVE,
      signedContract: { status: SignedContractStatus.ACTIVE },
    });
    categoryRepository.findOne.mockResolvedValue({ id: 'category-id' });
    cityRepository.findOne.mockResolvedValue({ id: 'city-id' });
    settingService.getSetting.mockResolvedValue({
      premiumAdEnabled: true,
      premiumAdFee: 75,
      premiumAdDurationDays: 30,
      freeAdValidityDays: 30,
    });
  });

  it('requires an active provider with an active platform contract to create', async () => {
    providerRepository.findOne.mockResolvedValue({
      id: 'provider-id',
      status: ProviderStatus.ACTIVE,
      signedContract: { status: SignedContractStatus.PENDING },
    });

    await expect(
      service.create(
        {
          categoryId: 'category-id',
          cityId: 'city-id',
          name: 'Listing',
          description: 'Listing description',
          price: 100,
          type: ListingType.FREE,
          story: null,
          photos: [],
        },
        'provider-id',
      ),
    ).rejects.toThrow('An active platform contract is required');
    expect(categoryRepository.findOne).not.toHaveBeenCalled();
  });

  it('publishes a featured listing as a normal ad until its fee is paid (S4-10)', async () => {
    const listing = await service.create(
      {
        categoryId: 'category-id',
        cityId: 'city-id',
        name: 'Featured Listing',
        description: 'Featured listing description',
        price: 100,
        type: ListingType.FEATURED,
        story: null,
        photos: [],
      },
      'provider-id',
    );

    expect(listing).toMatchObject({
      type: ListingType.FREE,
      status: ListingStatus.ACTIVE,
      promotionStatus: PromotionStatus.PENDING_PAYMENT,
      promotionCycle: 0,
      featuredStartsAt: null,
      featuredEndsAt: null,
    });
  });

  it('refuses new ads in an inactive category (S4-56)', async () => {
    categoryRepository.findOne.mockResolvedValue({
      id: 'category-id',
      status: CategoryStatus.INACTIVE,
    });
    await expect(
      service.create(
        {
          categoryId: 'category-id',
          cityId: 'city-id',
          name: 'Listing',
          description: 'Listing description',
          price: 100,
          type: ListingType.FREE,
          story: null,
          photos: [],
        },
        'provider-id',
      ),
    ).rejects.toThrow('This section is currently unavailable');
    expect(listingRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a non-video story when creating a listing', async () => {
    await expect(
      service.create(
        {
          categoryId: 'category-id',
          cityId: 'city-id',
          name: 'Listing',
          description: 'Listing description',
          price: 100,
          type: ListingType.FREE,
          story: {
            id: 'd606b5d9-8501-4897-a0ee-9a8b9fc603d1',
            filename: 'story.jpg',
            originalFilename: 'story.jpg',
            size: 1024,
            sortOrder: 0,
            type: MediaType.IMAGE,
          },
          photos: [],
        },
        'provider-id',
      ),
    ).rejects.toThrow('Listing story must be a video');
    expect(categoryRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a non-video story when updating a listing', async () => {
    listingRepository.findOne.mockResolvedValue({
      id: 'listing-id',
      providerId: 'provider-id',
      story: null,
    });

    await expect(
      service.update(
        'listing-id',
        {
          id: 'listing-id',
          story: {
            id: 'd606b5d9-8501-4897-a0ee-9a8b9fc603d1',
            filename: 'story.jpg',
            originalFilename: 'story.jpg',
            size: 1024,
            sortOrder: 0,
            type: MediaType.IMAGE,
          },
        },
        'provider-id',
      ),
    ).rejects.toThrow('Listing story must be a video');
    expect(listingRepository.save).not.toHaveBeenCalled();
  });

  it('returns a non-public listing only to its provider owner', async () => {
    const listing = {
      id: 'listing-id',
      providerId: 'provider-id',
      status: ListingStatus.PENDING_PAYMENT,
    };
    listingRepository.findOne.mockResolvedValue(listing);

    await expect(
      service.findOwnedOne('listing-id', 'other-provider'),
    ).rejects.toThrow('You are not authorized');
    await expect(
      service.findOwnedOne('listing-id', 'provider-id'),
    ).resolves.toBe(listing);
  });

  it('orders public listings by featured status, then badge tier', async () => {
    const orderBy = jest.fn().mockReturnThis();
    const addOrderBy = jest.fn().mockReturnThis();
    const addSelect = jest.fn().mockReturnThis();
    const setParameter = jest.fn().mockReturnThis();
    const setParameters = jest.fn().mockReturnThis();
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy,
      addOrderBy,
      setParameter,
      setParameters,
      addSelect,
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          { id: 'featured', type: ListingType.FEATURED },
          { id: 'free', type: ListingType.FREE },
        ],
        2,
      ]),
    };
    listingRepository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findAll({
      page: 1,
      limit: 10,
      categoryId: 'category-id',
    });

    expect(addSelect).toHaveBeenCalledWith(
      expect.stringContaining('listing.type'),
      'featured_rank',
    );
    expect(orderBy).toHaveBeenCalledWith('featured_rank', 'ASC');
    expect(addSelect).toHaveBeenCalledWith(
      expect.stringContaining('provider.badge'),
      'badge_rank',
    );
    expect(setParameters).toHaveBeenCalledWith({
      trustBadge: 'TRUST',
      diligenceBadge: 'DILIGENCE',
      underImprovementBadge: 'UNDER_IMPROVEMENT',
    });
    // Badge tier comes straight after featured status, before rating.
    expect(addOrderBy.mock.calls[0]).toEqual(['badge_rank', 'ASC']);
    expect(addOrderBy.mock.calls[1]).toEqual(['listing.ratingAverage', 'DESC']);
    expect(setParameter).toHaveBeenCalledWith(
      'featuredType',
      ListingType.FEATURED,
    );
    expect(result.items[0].type).toBe(ListingType.FEATURED);
    expect(result.items[1].type).toBe(ListingType.FREE);
  });

  it('filters by minimum rating in Postgres, even with search text (ClickUp 869fmut30)', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere,
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    listingRepository.createQueryBuilder.mockReturnValue(qb);
    // Elasticsearch is on, but its index has no ratings.
    const searchListings = jest.fn();
    Object.assign(searchService, { isEnabled: true, searchListings });

    try {
      await service.findAll({
        page: 1,
        limit: 10,
        categoryId: 'category-id',
        search: 'pipe',
        minRating: 4,
      });
    } finally {
      Object.assign(searchService, { isEnabled: false });
    }

    expect(searchListings).not.toHaveBeenCalled();
    expect(andWhere).toHaveBeenCalledWith(
      'listing.ratingAverage >= :minRating',
      { minRating: 4 },
    );
  });

  it("lists only one provider's ads for the provider page (ClickUp 869fnvz70)", async () => {
    const andWhere = jest.fn().mockReturnThis();
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere,
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    listingRepository.createQueryBuilder.mockReturnValue(qb);
    // The search index has no provider filter, so Postgres answers.
    const searchListings = jest.fn();
    Object.assign(searchService, { isEnabled: true, searchListings });

    try {
      await service.findAll({
        page: 1,
        limit: 10,
        search: 'pipe',
        providerId: 'provider-id',
      });
    } finally {
      Object.assign(searchService, { isEnabled: false });
    }

    expect(searchListings).not.toHaveBeenCalled();
    expect(andWhere).toHaveBeenCalledWith('listing.providerId = :providerId', {
      providerId: 'provider-id',
    });
  });

  it('returns one trusted ad per Trust-badge provider in query order', async () => {
    listingRepository.query.mockResolvedValue([{ id: 'b' }, { id: 'a' }]);
    listingRepository.find.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const result = await service.findTrusted(50);

    const [sql, params] = listingRepository.query.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('DISTINCT ON (l."providerId")');
    expect(sql).toContain('p.badge = $3');
    expect(params).toEqual([
      'ACTIVE',
      'ACTIVE',
      'TRUST',
      ListingType.FEATURED,
      'COMPLETED',
      20,
    ]);
    expect(result.map((listing) => listing.id)).toEqual(['b', 'a']);
  });

  it('skips the listing lookup when no provider holds the Trust badge', async () => {
    listingRepository.query.mockResolvedValue([]);

    await expect(service.findTrusted()).resolves.toEqual([]);
    const [, params] = listingRepository.query.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(params).toContain(10);
    expect(listingRepository.find).not.toHaveBeenCalled();
  });

  it('schedules and idempotently expires featured promotions', async () => {
    const listing = {
      id: 'listing-id',
      type: ListingType.FEATURED,
      status: ListingStatus.ACTIVE,
      promotionStatus: PromotionStatus.ACTIVE,
      featuredEndsAt: new Date(Date.now() - 1_000),
    };
    listingRepository.find.mockResolvedValue([listing]);
    listingRepository.update
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });

    const metadata = Reflect.getMetadata(
      SCHEDULE_INTERVAL_OPTIONS,
      ListingService.prototype.expireFeaturedPromotions,
    ) as { timeout: number };
    expect(metadata.timeout).toBe(60_000);

    await service.expireFeaturedPromotions();
    await service.expireFeaturedPromotions();

    expect(listingRepository.update).toHaveBeenCalledWith(
      { id: 'listing-id', promotionStatus: PromotionStatus.ACTIVE },
      {
        type: ListingType.FREE,
        status: ListingStatus.ACTIVE,
        promotionStatus: PromotionStatus.EXPIRED,
        // S4-61: the free period starts when the featured one ends.
        expiresAt: expect.any(Date) as Date,
      },
    );
    expect(searchService.indexListing).toHaveBeenCalledTimes(1);
  });

  describe('free-ad expiry (S4-59 → S4-63)', () => {
    const DAY = 86_400_000;
    const owned = (overrides: Record<string, unknown> = {}) => ({
      id: 'listing-id',
      providerId: 'provider-id',
      categoryId: 'category-id',
      name: 'Plumbing',
      type: ListingType.FREE,
      status: ListingStatus.EXPIRED,
      promotionStatus: PromotionStatus.NONE,
      expiresAt: new Date(Date.now() - DAY),
      ...overrides,
    });
    const withinADay = (value: unknown, days: number) => {
      const ms = (value as Date).getTime() - Date.now();
      expect(Math.abs(ms - days * DAY)).toBeLessThan(60_000);
    };

    it('gives a new free ad the configured validity, and a Trust provider none', async () => {
      settingService.getSetting.mockResolvedValue({
        premiumAdEnabled: false,
        premiumAdFee: 0,
        premiumAdDurationDays: 30,
        freeAdValidityDays: 7,
      });
      const input = {
        categoryId: 'category-id',
        cityId: 'city-id',
        name: 'Ad',
        description: 'Ad',
        price: 10,
        type: ListingType.FREE,
        photos: [{ url: 'p.jpg', type: MediaType.IMAGE }],
      };

      const free = await service.create(input as never, 'provider-id');
      withinADay(free.expiresAt, 7);

      providerRepository.findOne.mockResolvedValue({
        id: 'provider-id',
        status: ProviderStatus.ACTIVE,
        badge: 'TRUST',
        signedContract: { status: SignedContractStatus.ACTIVE },
      });
      const trusted = await service.create(input as never, 'provider-id');
      expect(trusted.expiresAt).toBeNull();
    });

    it('expires due free ads once, notifies the owner, and skips Trust providers', async () => {
      const where: string[] = [];
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn((sql: string) => (where.push(sql), qb)),
        andWhere: jest.fn((sql: string) => (where.push(sql), qb)),
        getMany: jest
          .fn()
          .mockResolvedValue([owned({ status: ListingStatus.ACTIVE })]),
      };
      listingRepository.createQueryBuilder.mockReturnValue(qb);
      listingRepository.update
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 });
      const notifyLocalized = jest.fn();
      (service as unknown as { notifications: unknown }).notifications = {
        notifyLocalized,
      };

      const metadata = Reflect.getMetadata(
        SCHEDULE_INTERVAL_OPTIONS,
        ListingService.prototype.expireFreeListings,
      ) as { timeout: number };
      expect(metadata.timeout).toBe(60_000);

      await service.expireFreeListings();
      await service.expireFreeListings();

      expect(where.join(' ')).toContain('provider.badge IS DISTINCT FROM');
      expect(listingRepository.update).toHaveBeenCalledWith(
        { id: 'listing-id', status: ListingStatus.ACTIVE },
        { status: ListingStatus.EXPIRED },
      );
      expect(notifyLocalized).toHaveBeenCalledTimes(1);
      expect(notifyLocalized).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'LISTING_EXPIRED' }),
      );
      expect(searchService.indexListing).toHaveBeenCalledTimes(1);
      (service as unknown as { notifications: unknown }).notifications =
        undefined;
    });

    it('re-publishes an expired ad for a fresh free period, optionally to feature', async () => {
      listingRepository.findOne.mockResolvedValue(owned());
      const free = await service.republish('listing-id', 'provider-id', false);
      expect(free.status).toBe(ListingStatus.ACTIVE);
      expect(free.promotionStatus).toBe(PromotionStatus.NONE);
      withinADay(free.expiresAt, 30);

      listingRepository.findOne.mockResolvedValue(owned());
      const featured = await service.republish(
        'listing-id',
        'provider-id',
        true,
      );
      expect(featured.promotionStatus).toBe(PromotionStatus.PENDING_PAYMENT);
    });

    it('refuses to re-publish an ad that is not expired or not owned', async () => {
      listingRepository.findOne.mockResolvedValue(
        owned({ status: ListingStatus.ACTIVE }),
      );
      await expect(
        service.republish('listing-id', 'provider-id', false),
      ).rejects.toThrow('Only an expired ad can be re-published');

      listingRepository.findOne.mockResolvedValue(
        owned({ providerId: 'someone-else' }),
      );
      await expect(
        service.republish('listing-id', 'provider-id', false),
      ).rejects.toThrow();
      expect(listingRepository.save).not.toHaveBeenCalled();
    });

    it('lets an active free ad be featured again after its promotion ended', async () => {
      listingRepository.findOne.mockResolvedValue(
        owned({
          status: ListingStatus.ACTIVE,
          promotionStatus: PromotionStatus.EXPIRED,
        }),
      );
      const result = await service.requestFeature('listing-id', 'provider-id');
      expect(result.promotionStatus).toBe(PromotionStatus.PENDING_PAYMENT);

      listingRepository.findOne.mockResolvedValue(
        owned({
          status: ListingStatus.ACTIVE,
          promotionStatus: PromotionStatus.PENDING_PAYMENT,
        }),
      );
      await expect(
        service.requestFeature('listing-id', 'provider-id'),
      ).rejects.toThrow('already featured or awaiting payment');
    });

    it('clears expiry when a provider gains the Trust Badge and restarts it when lost', async () => {
      await service.applyTrustBadgeChange('provider-id', true);
      expect(listingRepository.update).toHaveBeenLastCalledWith(
        { providerId: 'provider-id', status: ListingStatus.ACTIVE },
        { expiresAt: null },
      );

      await service.applyTrustBadgeChange('provider-id', false);
      const [criteria, values] = listingRepository.update.mock.calls.at(-1) as [
        Record<string, unknown>,
        { expiresAt: Date },
      ];
      expect(criteria).toMatchObject({
        providerId: 'provider-id',
        status: ListingStatus.ACTIVE,
        type: ListingType.FREE,
      });
      withinADay(values.expiresAt, 30);
    });

    it('lists only active ads for non-admins whatever status they ask for', async () => {
      const calls: unknown[] = [];
      const qb = new Proxy(
        {},
        {
          get: (_t, key) => {
            if (key === 'getManyAndCount')
              return () => Promise.resolve([[], 0]);
            if (key === 'getRawMany') return () => Promise.resolve([]);
            return (...args: unknown[]) => {
              calls.push([key, ...args]);
              return qb;
            };
          },
        },
      );
      listingRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: ListingStatus.EXPIRED });
      expect(calls).toContainEqual([
        'where',
        'listing.status = :status',
        { status: ListingStatus.ACTIVE },
      ]);

      calls.length = 0;
      await service.findAll({ status: ListingStatus.EXPIRED }, undefined, {
        isAdmin: true,
      });
      expect(calls).toContainEqual([
        'where',
        'listing.status = :status',
        { status: ListingStatus.EXPIRED },
      ]);
    });
  });
});
