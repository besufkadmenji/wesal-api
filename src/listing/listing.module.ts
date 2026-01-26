import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingService } from './listing.service';
import { ListingResolver } from './listing.resolver';
import { Listing } from './entities/listing.entity';
import { User } from '../user/entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { City } from '../city/entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, User, Category, City])],
  providers: [ListingResolver, ListingService],
  exports: [ListingService],
})
export class ListingModule {}
