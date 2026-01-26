import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from 'src/listing/entities/listing.entity';
import { User } from '../user/entities/user.entity';
import { Rating } from './entities/rating.entity';
import { RatingResolver } from './rating.resolver';
import { RatingService } from './rating.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rating, User, Listing])],
  providers: [RatingResolver, RatingService],
  exports: [RatingService],
})
export class RatingModule {}
