import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { BadgeService, badgePeriod } from './badge.service';
import { UpdateBadgeSettingsInput } from './dto/update-badge-settings.input';
import { BadgeRun } from './entities/badge-run.entity';
import { BadgeSetting } from './entities/badge-setting.entity';

@Resolver()
export class BadgeResolver {
  constructor(private readonly badgeService: BadgeService) {}

  @Query(() => [BadgeSetting], {
    description: 'Badge thresholds, highest tier first (BRD 4.3.18)',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('badge', 'read')
  badgeSettings(): Promise<BadgeSetting[]> {
    return this.badgeService.settings();
  }

  @Query(() => BadgeRun, {
    nullable: true,
    description: 'Summary of the most recent monthly badge run',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('badge', 'read')
  badgeLastRun(): Promise<BadgeRun | null> {
    return this.badgeService.lastRun();
  }

  @Mutation(() => [BadgeSetting])
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('badge', 'update')
  updateBadgeSettings(
    @Args('input') input: UpdateBadgeSettingsInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<BadgeSetting[]> {
    return this.badgeService.updateSettings(input, language);
  }

  @Mutation(() => BadgeRun, {
    description:
      "Runs this month's badge assignment now instead of waiting for the 1st. It counts as the month's run.",
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('badge', 'full_access')
  runBadgeAssignment(@GetLanguage() language: LanguageCode): Promise<BadgeRun> {
    return this.badgeService.runAssignment(badgePeriod(), language);
  }
}
