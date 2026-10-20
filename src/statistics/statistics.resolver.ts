import { Inject, UseGuards } from '@nestjs/common';
import { Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from 'lib/pubsub/pubsub.module';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { WsAdminAuthGuard } from '../admin/guards/ws-admin-auth.guard';
import { AdminDashboardStats } from './dto/admin-dashboard-stats.response';
import { PlatformStats } from './dto/platform-stats.response';
import {
  ADMIN_DASHBOARD_STATS_UPDATED_EVENT,
  PLATFORM_STATS_UPDATED_EVENT,
} from './statistics.constants';
import { StatisticsService } from './statistics.service';

@Resolver()
export class StatisticsResolver {
  constructor(
    private readonly statisticsService: StatisticsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => PlatformStats, {
    description: 'Public home page statistics (visitors included)',
  })
  platformStats(): Promise<PlatformStats> {
    return this.statisticsService.platformStats();
  }

  @Query(() => AdminDashboardStats, {
    description: 'Admin home statistics cards',
  })
  @UseGuards(AdminAuthGuard)
  adminDashboardStats(): Promise<AdminDashboardStats> {
    return this.statisticsService.adminDashboardStats();
  }

  @Subscription(() => PlatformStats, {
    description:
      'Pushes the public home page statistics whenever one of them changes',
  })
  platformStatsUpdated() {
    return this.pubSub.asyncIterableIterator(PLATFORM_STATS_UPDATED_EVENT);
  }

  @Subscription(() => AdminDashboardStats, {
    description:
      'Pushes the admin home statistics whenever one of them changes (admin connections only)',
  })
  @UseGuards(WsAdminAuthGuard)
  adminDashboardStatsUpdated() {
    return this.pubSub.asyncIterableIterator(
      ADMIN_DASHBOARD_STATS_UPDATED_EVENT,
    );
  }
}
