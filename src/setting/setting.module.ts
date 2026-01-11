import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingService } from './setting.service';
import { SettingResolver } from './setting.resolver';
import { Setting } from './entities/setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  providers: [SettingResolver, SettingService],
  exports: [SettingService],
})
export class SettingModule {}
