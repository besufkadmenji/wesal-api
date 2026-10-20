import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import {
  DashboardAttentionCounts,
  DashboardContractStatusCount,
  DashboardGrowthPoint,
  DashboardRevenuePoint,
  DashboardTopCategory,
} from './dto/dashboard-insights.response';
import { DashboardRange } from './dto/dashboard-range.enum';
import { DashboardInsightsService } from './dashboard-insights.service';

/** UI-14: admin dashboard charts and the "needs attention" panel. */
@Resolver()
@UseGuards(AdminAuthGuard, AdminPermissionGuard)
export class DashboardInsightsResolver {
  constructor(private readonly insights: DashboardInsightsService) {}

  @Query(() => [DashboardRevenuePoint], {
    description: 'Platform revenue per bucket (commission and fees)',
  })
  @RequirePermission('report', 'read')
  adminRevenueSeries(
    @Args('range', { type: () => DashboardRange }) range: DashboardRange,
  ) {
    return this.insights.revenueSeries(range);
  }

  @Query(() => [DashboardGrowthPoint], {
    description: 'New customers and providers per bucket',
  })
  @RequirePermission('user', 'read')
  adminGrowthSeries(
    @Args('range', { type: () => DashboardRange }) range: DashboardRange,
  ) {
    return this.insights.growthSeries(range);
  }

  @Query(() => [DashboardContractStatusCount], {
    description:
      'Contracts created in the period, per status (drafts excluded)',
  })
  @RequirePermission('contract', 'read')
  adminContractStatusBreakdown(
    @Args('range', { type: () => DashboardRange }) range: DashboardRange,
  ) {
    return this.insights.contractStatusBreakdown(range);
  }

  @Query(() => [DashboardTopCategory], {
    description: 'Top 6 categories by contracts created in the period',
  })
  @RequirePermission('contract', 'read')
  adminTopCategories(
    @Args('range', { type: () => DashboardRange }) range: DashboardRange,
  ) {
    return this.insights.topCategories(range);
  }

  @Query(() => DashboardAttentionCounts, {
    description: 'Items waiting for an admin, limited to readable modules',
  })
  adminAttentionCounts(@CurrentAdmin() admin: AdminJwtPayload) {
    return this.insights.attentionCounts(admin);
  }
}
