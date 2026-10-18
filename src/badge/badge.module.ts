import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { AdminPermission } from '../admin-permission/entities/admin-permission.entity';
import { Contract } from '../contract/entities/contract.entity';
import { NotificationModule } from '../notification/notification.module';
import { Provider } from '../provider/entities/provider.entity';
import { ProviderModule } from '../provider/provider.module';
import { BadgeResolver } from './badge.resolver';
import { BadgeService } from './badge.service';
import { BadgeRun } from './entities/badge-run.entity';
import { BadgeSetting } from './entities/badge-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BadgeSetting,
      BadgeRun,
      Provider,
      Contract,
      AdminPermission,
    ]),
    AdminPermissionGuardModule,
    NotificationModule,
    ProviderModule,
  ],
  providers: [BadgeService, BadgeResolver],
  exports: [BadgeService],
})
export class BadgeModule {}
