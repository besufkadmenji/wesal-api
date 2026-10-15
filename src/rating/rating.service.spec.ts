/* eslint-disable @typescript-eslint/no-unsafe-return */
import { RatingService } from './rating.service';
import { RatingStatus } from './enums/rating-status.enum';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { AdminPermissionType } from '../admin/enums/admin-permission-type.enum';

describe('RatingService', () => {
  const contract = {
    id: 'contract-id',
    publicId: 1042,
    clientId: 'customer-id',
    providerId: 'provider-id',
    listingId: 'listing-id',
    status: ContractStatus.COMPLETED,
  };
  const lockedQuery = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const contractRepository = {
    createQueryBuilder: jest.fn(() => lockedQuery),
  };
  const ratingsInTransaction = {
    exists: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve({ id: 'rating-id', ...value })),
    createQueryBuilder: jest.fn(() => lockedQuery),
  };
  const manager = {
    getRepository: jest.fn((entity: { name: string }) =>
      entity.name === 'Contract' ? contractRepository : ratingsInTransaction,
    ),
    query: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((callback: (m: typeof manager) => unknown) =>
      Promise.resolve(callback(manager)),
    ),
  };
  const ratingRepository = {
    findOne: jest.fn((options: { where: { id: string } }) =>
      Promise.resolve({ id: options.where.id }),
    ),
  };
  const notificationService = { createForRecipient: jest.fn() };
  const service = new RatingService(
    ratingRepository as never,
    dataSource as never,
    notificationService as never,
  );
  const customer = {
    sub: 'customer-id',
    email: 'customer@example.com',
    type: 'user' as const,
  };
  const admin = {
    sub: 'admin-id',
    email: 'admin@example.com',
    permissionType: AdminPermissionType.SUPER_ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    lockedQuery.getOne.mockResolvedValue({ ...contract });
    ratingsInTransaction.exists.mockResolvedValue(false);
  });

  it('records a published rating for the contract customer and refreshes aggregates', async () => {
    await service.rateContract(
      {
        contractId: contract.id,
        rating: 4,
        comment: '  خدمة ممتازة، شكراً!  ',
      },
      customer,
    );

    expect(ratingsInTransaction.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'customer-id',
        listingId: 'listing-id',
        providerId: 'provider-id',
        contractId: 'contract-id',
        rating: 4,
        comment: 'خدمة ممتازة، شكراً!',
        status: RatingStatus.PUBLISHED,
        isSystemGenerated: false,
      }),
    );
    expect(manager.query).toHaveBeenCalledTimes(2);
    expect((manager.query.mock.calls as unknown[][])[0][1]).toEqual([
      'listing-id',
      RatingStatus.PUBLISHED,
    ]);
    expect((manager.query.mock.calls as unknown[][])[1][1]).toEqual([
      'provider-id',
    ]);
    expect(notificationService.createForRecipient).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'provider-id',
        type: NotificationType.NEW_RATING,
        relatedEntityId: 'contract-id',
      }),
    );
  });

  it('stores an empty comment as null', async () => {
    await service.rateContract(
      { contractId: contract.id, rating: 5, comment: '   ' },
      customer,
    );
    expect(ratingsInTransaction.save).toHaveBeenCalledWith(
      expect.objectContaining({ comment: null }),
    );
  });

  it('rejects providers rating contracts', async () => {
    await expect(
      service.rateContract(
        { contractId: contract.id, rating: 5 },
        { ...customer, sub: 'provider-id', type: 'provider' },
      ),
    ).rejects.toThrow('not authorized');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("rejects rating another customer's contract", async () => {
    await expect(
      service.rateContract(
        { contractId: contract.id, rating: 5 },
        { ...customer, sub: 'someone-else' },
      ),
    ).rejects.toThrow('not authorized');
    expect(ratingsInTransaction.save).not.toHaveBeenCalled();
  });

  it.each([
    ContractStatus.PENDING,
    ContractStatus.IN_PROGRESS,
    ContractStatus.DELIVERY_IN_PROGRESS,
    ContractStatus.CANCELLED,
  ])('rejects rating a %s contract', async (status) => {
    lockedQuery.getOne.mockResolvedValue({ ...contract, status });
    await expect(
      service.rateContract({ contractId: contract.id, rating: 5 }, customer),
    ).rejects.toThrow('completed contracts');
    expect(ratingsInTransaction.save).not.toHaveBeenCalled();
  });

  it('allows only one rating per contract', async () => {
    ratingsInTransaction.exists.mockResolvedValue(true);
    await expect(
      service.rateContract({ contractId: contract.id, rating: 5 }, customer),
    ).rejects.toThrow('already rated');
    expect(ratingsInTransaction.save).not.toHaveBeenCalled();
  });

  it.each([0, 6, 2.5])('rejects %p stars', async (rating) => {
    await expect(
      service.rateContract({ contractId: contract.id, rating }, customer),
    ).rejects.toThrow('between 1 and 5');
  });

  it.each(['<script>alert(1)</script>', 'great 😀', 'x'.repeat(1001)])(
    'rejects disallowed comment %#',
    async (comment) => {
      await expect(
        service.rateContract(
          { contractId: contract.id, rating: 5, comment },
          customer,
        ),
      ).rejects.toThrow('letters, numbers');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    },
  );

  it('hides a rating, records the moderator and refreshes aggregates', async () => {
    const rating = {
      id: 'rating-id',
      listingId: 'listing-id',
      providerId: 'provider-id',
      status: RatingStatus.PUBLISHED,
    };
    lockedQuery.getOne.mockResolvedValue(rating);

    await service.setStatus('rating-id', RatingStatus.HIDDEN, admin);

    expect(ratingsInTransaction.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RatingStatus.HIDDEN,
        moderatedByAdminId: 'admin-id',
        moderatedAt: expect.any(Date) as Date,
      }),
    );
    expect(manager.query).toHaveBeenCalledTimes(2);
  });

  it('treats setting the current status as a no-op', async () => {
    lockedQuery.getOne.mockResolvedValue({
      id: 'rating-id',
      status: RatingStatus.HIDDEN,
    });
    await service.setStatus('rating-id', RatingStatus.HIDDEN, admin);
    expect(ratingsInTransaction.save).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
  });
});
