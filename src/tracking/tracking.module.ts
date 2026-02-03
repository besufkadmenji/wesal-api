import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingResolver } from './tracking.resolver';
import { TrackingService } from './tracking.service';
import { Tracking } from './entities/tracking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tracking])],
  providers: [TrackingResolver, TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
