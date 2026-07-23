/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
import { SCHEDULE_INTERVAL_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { SignedContractStatus } from '../provider/enums/contract.enum';
import {
  ListingStatus,
  ListingType,
  PromotionStatus,
} from './enums/listing.enum';
import { ListingService } from './listing.service';

describe('ListingService provider finalization', () => {
  const listingRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    create: jest.fn((value) => value),
    save: jest
      .fn()
      .mockImplementation((value) =>
        Promise.resolve({ id: 'listing-id', ...value }),
      ),
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
          story: undefined as never,
          photos: [],
        },
        'provider-id',
      ),
    ).rejects.toThrow('An active platform contract is required');
    expect(categoryRepository.findOne).not.toHaveBeenCalled();
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
      },
    );
    expect(searchService.indexListing).toHaveBeenCalledTimes(1);
  });
});
