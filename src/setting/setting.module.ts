import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { SettingService } from './setting.service';
import { SettingResolver } from './setting.resolver';
import { SettingController } from './setting.controller';
import { Setting } from './entities/setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Setting]), AdminPermissionGuardModule],
  controllers: [SettingController],
  providers: [SettingResolver, SettingService],
  exports: [SettingService],
})
export class SettingModule {}
