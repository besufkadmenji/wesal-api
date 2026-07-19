import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { FeeReportInput } from './dto/fee-report.input';
import {
  ConversationFeeReport,
  PremiumAdFeeReport,
} from './dto/fee-report.response';
import { ReportService } from './report.service';

@Resolver()
@UseGuards(AdminAuthGuard, AdminPermissionGuard)
@RequirePermission('report', 'read')
export class ReportResolver {
  constructor(private readonly reportService: ReportService) {}

  @Query(() => ConversationFeeReport)
  conversationFeeReport(
    @Args('input', { nullable: true }) input?: FeeReportInput,
  ) {
    return this.reportService.conversationFees(input ?? {});
  }

  @Query(() => PremiumAdFeeReport)
  premiumAdFeeReport(
    @Args('input', { nullable: true }) input?: FeeReportInput,
  ) {
    return this.reportService.premiumAds(input ?? {});
  }
}
