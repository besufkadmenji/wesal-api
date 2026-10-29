import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from 'lib/pubsub/pubsub.module';
import { In, IsNull, Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { Message } from '../conversation/entities/message.entity';
import { ConversationSenderType } from '../conversation/enums/sender-type.enum';
import { Listing } from '../listing/entities/listing.entity';
import { ListingStatus, ListingType } from '../listing/enums/listing.enum';
import { Provider } from '../provider/entities/provider.entity';
import { LISTED_PROVIDER_STATUSES } from '../provider/enums/provider-status.enum';
import { User } from '../user/entities/user.entity';
import { LISTED_USER_STATUSES } from '../user/enums/user-status.enum';
import { AdminDashboardStats } from './dto/admin-dashboard-stats.response';
import { PlatformStats } from './dto/platform-stats.response';
import {
  ADMIN_DASHBOARD_STATS_UPDATED_EVENT,
  PLATFORM_STATS_UPDATED_EVENT,
  STATISTICS_DEBOUNCE_MS,
  STATISTICS_RECONCILE_MS,
  STATISTICS_TIME_ZONE,
} from './statistics.constants';
import { CategoryStatus } from '../category/enum/category.enum';

/**
 * Keeps one in-memory snapshot of every statistic, recounts it after writes
 * that can change a number (see StatisticsSubscriber), and pushes the public
 * and admin views to their subscriptions only when they actually change.
 */
@Injectable()
export class StatisticsService implements OnApplicationShutdown {
  private readonly logger = new Logger(StatisticsService.name);
  private snapshot: AdminDashboardStats | null = null;
  private dirty = true;
  private debounceTimer: NodeJS.Timeout | null = null;
  private refreshing: Promise<AdminDashboardStats> | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async platformStats(): Promise<PlatformStats> {
    return toPlatformStats(await this.current());
  }

  async adminDashboardStats(): Promise<AdminDashboardStats> {
    return { ...(await this.current()) };
  }

  /** Schedules a debounced recount; called after any relevant write. */
  markDirty(): void {
    this.dirty = true;
    if (this.debounceTimer) return;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.refresh()
        .then(() => {
          // A write that landed while an earlier recount was in flight was
          // not included in it; count again.
          if (this.dirty) this.markDirty();
        })
        .catch((error: unknown) =>
          this.logger.error('Failed to refresh statistics', error),
        );
    }, STATISTICS_DEBOUNCE_MS);
  }

  /** "Messages today" restarts at local midnight without any write. */
  @Cron('0 0 * * *', { timeZone: STATISTICS_TIME_ZONE })
  handleNewDay(): void {
    this.markDirty();
  }

  @Interval(STATISTICS_RECONCILE_MS)
  reconcile(): void {
    this.markDirty();
  }

  onApplicationShutdown(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }

  /** Recounts (coalescing concurrent callers) and publishes any change. */
  async refresh(): Promise<AdminDashboardStats> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.recountAndPublish().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async current(): Promise<AdminDashboardStats> {
    if (this.refreshing) return this.refreshing;
    if (!this.snapshot || this.dirty) return this.refresh();
    return this.snapshot;
  }

  private async recountAndPublish(): Promise<AdminDashboardStats> {
    // Cleared before counting so a write that lands mid-count marks it again.
    this.dirty = false;
    const previous = this.snapshot;
    const next = await this.count();
    this.snapshot = next;

    if (!previous) return next;
    if (!sameStats(toPlatformStats(previous), toPlatformStats(next))) {
      await this.pubSub.publish(PLATFORM_STATS_UPDATED_EVENT, {
        platformStatsUpdated: toPlatformStats(next),
      });
    }
    if (!sameStats(previous, next)) {
      await this.pubSub.publish(ADMIN_DASHBOARD_STATS_UPDATED_EVENT, {
        adminDashboardStatsUpdated: { ...next },
      });
    }
    return next;
  }

  private async count(): Promise<AdminDashboardStats> {
    const [
      customers,
      providers,
      completedContracts,
      messagesToday,
      featuredListings,
      freeListings,
    ] = await Promise.all([
      // The same accounts the admin Users and Providers lists show, so each
      // card equals its list's total (ClickUp 869fn0tyd).
      this.userRepository.count({
        where: {
          status: In(LISTED_USER_STATUSES),
          emailVerified: true,
          phoneVerified: true,
          deletedAt: IsNull(),
        },
      }),
      this.providerRepository.count({
        where: {
          status: In(LISTED_PROVIDER_STATUSES),
          emailVerified: true,
          phoneVerified: true,
          deletedAt: IsNull(),
        },
      }),
      this.contractRepository.count({
        where: { status: ContractStatus.COMPLETED },
      }),
      this.messageRepository
        .createQueryBuilder('message')
        .where('message.senderType <> :system', {
          system: ConversationSenderType.SYSTEM,
        })
        .andWhere(
          `message.createdAt >= (date_trunc('day', now() AT TIME ZONE :zone) AT TIME ZONE :zone)`,
          { zone: STATISTICS_TIME_ZONE },
        )
        .getCount(),
      // S4-56: ads of inactive categories are hidden, so not counted.
      this.listingRepository.count({
        where: {
          status: ListingStatus.ACTIVE,
          type: ListingType.FEATURED,
          category: { status: CategoryStatus.ACTIVE },
        },
      }),
      this.listingRepository.count({
        where: {
          status: ListingStatus.ACTIVE,
          type: ListingType.FREE,
          category: { status: CategoryStatus.ACTIVE },
        },
      }),
    ]);

    return {
      customers,
      providers,
      completedContracts,
      messagesToday,
      featuredListings,
      freeListings,
    };
  }
}

function toPlatformStats(stats: AdminDashboardStats): PlatformStats {
  return {
    completedContracts: stats.completedContracts,
    providers: stats.providers,
    customers: stats.customers,
  };
}

function sameStats<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as Array<keyof T>).every((key) => a[key] === b[key]);
}
