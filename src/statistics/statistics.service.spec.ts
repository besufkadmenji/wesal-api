import { PubSub } from 'graphql-subscriptions';
import { IsNull, Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { Message } from '../conversation/entities/message.entity';
import { Listing } from '../listing/entities/listing.entity';
import { ListingStatus, ListingType } from '../listing/enums/listing.enum';
import { Provider } from '../provider/entities/provider.entity';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { User } from '../user/entities/user.entity';
import { UserStatus } from '../user/enums/user-status.enum';
import {
  ADMIN_DASHBOARD_STATS_UPDATED_EVENT,
  PLATFORM_STATS_UPDATED_EVENT,
  STATISTICS_DEBOUNCE_MS,
} from './statistics.constants';
import { StatisticsService } from './statistics.service';
import { StatisticsSubscriber } from './statistics.subscriber';

type Counts = {
  customers: number;
  providers: number;
  completedContracts: number;
  messagesToday: number;
  featuredListings: number;
  freeListings: number;
};

describe('StatisticsService', () => {
  let counts: Counts;
  let userCount: jest.Mock;
  let providerCount: jest.Mock;
  let contractCount: jest.Mock;
  let listingCount: jest.Mock;
  let messageQuery: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
  };
  let publish: jest.Mock;
  let service: StatisticsService;

  beforeEach(() => {
    counts = {
      customers: 7,
      providers: 3,
      completedContracts: 12,
      messagesToday: 40,
      featuredListings: 2,
      freeListings: 9,
    };
    userCount = jest.fn(() => Promise.resolve(counts.customers));
    providerCount = jest.fn(() => Promise.resolve(counts.providers));
    contractCount = jest.fn(() => Promise.resolve(counts.completedContracts));
    listingCount = jest.fn((options: { where: { type: ListingType } }) =>
      Promise.resolve(
        options.where.type === ListingType.FEATURED
          ? counts.featuredListings
          : counts.freeListings,
      ),
    );
    messageQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(() => Promise.resolve(counts.messagesToday)),
    };
    publish = jest.fn(() => Promise.resolve());

    service = new StatisticsService(
      { count: userCount } as unknown as Repository<User>,
      { count: providerCount } as unknown as Repository<Provider>,
      { count: contractCount } as unknown as Repository<Contract>,
      {
        createQueryBuilder: jest.fn(() => messageQuery),
      } as unknown as Repository<Message>,
      { count: listingCount } as unknown as Repository<Listing>,
      { publish } as unknown as PubSub,
    );
  });

  afterEach(() => {
    service.onApplicationShutdown();
    jest.useRealTimers();
  });

  it('counts only active, non-deleted customers and providers', async () => {
    await expect(service.platformStats()).resolves.toEqual({
      customers: 7,
      providers: 3,
      completedContracts: 12,
    });

    expect(userCount).toHaveBeenCalledWith({
      where: { status: UserStatus.ACTIVE, isActive: true, deletedAt: IsNull() },
    });
    expect(providerCount).toHaveBeenCalledWith({
      where: {
        status: ProviderStatus.ACTIVE,
        isActive: true,
        deletedAt: IsNull(),
      },
    });
    expect(contractCount).toHaveBeenCalledWith({
      where: { status: ContractStatus.COMPLETED },
    });
  });

  it('returns the six admin cards with people-sent messages since Riyadh midnight', async () => {
    await expect(service.adminDashboardStats()).resolves.toEqual(counts);

    expect(messageQuery.where).toHaveBeenCalledWith(
      'message.senderType <> :system',
      { system: 'SYSTEM' },
    );
    expect(messageQuery.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("date_trunc('day', now() AT TIME ZONE :zone)"),
      { zone: 'Asia/Riyadh' },
    );
    expect(listingCount).toHaveBeenCalledWith({
      where: { status: ListingStatus.ACTIVE, type: ListingType.FEATURED },
    });
    expect(listingCount).toHaveBeenCalledWith({
      where: { status: ListingStatus.ACTIVE, type: ListingType.FREE },
    });
  });

  it('serves the cached snapshot until something marks it dirty', async () => {
    await service.platformStats();
    await service.adminDashboardStats();
    expect(userCount).toHaveBeenCalledTimes(1);

    service.markDirty();
    counts.customers = 8;
    await expect(service.platformStats()).resolves.toMatchObject({
      customers: 8,
    });
    expect(userCount).toHaveBeenCalledTimes(2);
  });

  it('does not publish the first snapshot or an unchanged recount', async () => {
    await service.refresh();
    await service.refresh();
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes only the admin view when an admin-only number changes', async () => {
    await service.refresh();
    counts.messagesToday = 41;
    await service.refresh();

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(ADMIN_DASHBOARD_STATS_UPDATED_EVENT, {
      adminDashboardStatsUpdated: { ...counts, messagesToday: 41 },
    });
  });

  it('publishes both views when a public number changes', async () => {
    await service.refresh();
    counts.completedContracts = 13;
    await service.refresh();

    expect(publish).toHaveBeenCalledWith(PLATFORM_STATS_UPDATED_EVENT, {
      platformStatsUpdated: {
        customers: 7,
        providers: 3,
        completedContracts: 13,
      },
    });
    expect(publish).toHaveBeenCalledWith(
      ADMIN_DASHBOARD_STATS_UPDATED_EVENT,
      expect.anything(),
    );
  });

  it('coalesces a burst of writes into one debounced recount', async () => {
    await service.refresh();
    jest.useFakeTimers();

    service.markDirty();
    service.markDirty();
    service.markDirty();
    expect(userCount).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(STATISTICS_DEBOUNCE_MS);
    expect(userCount).toHaveBeenCalledTimes(2);
  });
});

describe('StatisticsSubscriber', () => {
  const markDirty = jest.fn();
  const subscribers: unknown[] = [];
  const subscriber = new StatisticsSubscriber(
    { subscribers } as never,
    { markDirty } as unknown as StatisticsService,
  );
  const queryRunner = (isTransactionActive: boolean) => ({
    isTransactionActive,
    data: {},
  });

  beforeEach(() => markDirty.mockClear());

  it('registers itself with the data source', () => {
    expect(subscribers).toContain(subscriber);
  });

  it('marks dirty right away for a tracked write outside a transaction', () => {
    subscriber.afterUpdate({
      metadata: { target: User },
      queryRunner: queryRunner(false),
    } as never);
    expect(markDirty).toHaveBeenCalledTimes(1);
  });

  it('ignores writes to entities that no statistic depends on', () => {
    subscriber.afterInsert({
      metadata: { target: class Unrelated {} },
      queryRunner: queryRunner(false),
    } as never);
    expect(markDirty).not.toHaveBeenCalled();
  });

  it('waits for the commit inside a transaction, and drops it on rollback', () => {
    const committed = queryRunner(true);
    subscriber.afterInsert({
      metadata: { target: Message },
      queryRunner: committed,
    } as never);
    // save() inside an outer transaction swaps queryRunner.data and restores it.
    committed.data = {};
    expect(markDirty).not.toHaveBeenCalled();
    committed.isTransactionActive = false;
    subscriber.afterTransactionCommit({ queryRunner: committed } as never);
    expect(markDirty).toHaveBeenCalledTimes(1);

    const rolledBack = queryRunner(true);
    subscriber.afterRemove({
      metadata: { target: Listing },
      queryRunner: rolledBack,
    } as never);
    rolledBack.isTransactionActive = false;
    subscriber.afterTransactionRollback({ queryRunner: rolledBack } as never);
    subscriber.afterTransactionCommit({ queryRunner: rolledBack } as never);
    expect(markDirty).toHaveBeenCalledTimes(1);
  });

  it('waits for the outer commit when a nested savepoint is released', () => {
    const runner = queryRunner(true);
    subscriber.afterUpdate({
      metadata: { target: Contract },
      queryRunner: runner,
    } as never);
    subscriber.afterTransactionCommit({ queryRunner: runner } as never);
    expect(markDirty).not.toHaveBeenCalled();
    runner.isTransactionActive = false;
    subscriber.afterTransactionCommit({ queryRunner: runner } as never);
    expect(markDirty).toHaveBeenCalledTimes(1);
  });
});
