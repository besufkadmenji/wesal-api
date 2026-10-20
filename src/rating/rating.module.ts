import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { AdminPermission } from '../admin-permission/entities/admin-permission.entity';
import { NotificationModule } from '../notification/notification.module';
import { Rating } from './entities/rating.entity';
import { RatingResolver } from './rating.resolver';
import { ContractRatingResolver } from './contract-rating.resolver';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating, AdminPermission]),
    AdminPermissionGuardModule,
    NotificationModule,
  ],
  controllers: [RatingController],
  providers: [RatingResolver, ContractRatingResolver, RatingService],
  exports: [RatingService],
})
export class RatingModule {}
