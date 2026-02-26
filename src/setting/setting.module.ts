import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { SettingService } from './setting.service';
import { SettingResolver } from './setting.resolver';
import { SettingController } from './setting.controller';
import { Setting } from './entities/setting.entity';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Setting, AdminPermission]),
    AdminPermissionGuardModule,
  ],
  controllers: [SettingController],
  providers: [SettingResolver, SettingService],
  exports: [SettingService],
})
export class SettingModule {}
