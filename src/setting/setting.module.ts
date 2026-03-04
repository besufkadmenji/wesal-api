import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Setting } from './entities/setting.entity';
import { SettingController } from './setting.controller';
import { SettingResolver } from './setting.resolver';
import { SettingService } from './setting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Setting, AdminPermission, Admin]),
    AdminPermissionGuardModule,
  ],
  controllers: [SettingController],
  providers: [SettingResolver, SettingService],
  exports: [SettingService],
})
export class SettingModule {}
