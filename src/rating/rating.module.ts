import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingService } from './rating.service';
import { RatingResolver } from './rating.resolver';
import { Rating } from './entities/rating.entity';
import { User } from '../user/entities/user.entity';
import { Advertisement } from '../advertisement/entities/advertisement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rating, User, Advertisement])],
  providers: [RatingResolver, RatingService],
  exports: [RatingService],
})
export class RatingModule {}
