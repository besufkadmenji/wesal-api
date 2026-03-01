import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { SettingInput } from './dto/setting.input';
import { Setting } from './entities/setting.entity';
import { SettingService } from './setting.service';

@Resolver(() => Setting)
export class SettingResolver {
  constructor(private readonly settingService: SettingService) {}

  @Query(() => Setting, {
    description: 'Get application settings',
  })
  getSetting() {
    return this.settingService.getSetting();
  }

  @Mutation(() => Setting, {
    description: 'Create or update application settings (admin only)',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('setting', 'update')
  async setSetting(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('input') input: SettingInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.settingService.setSetting(input);
  }
}
