import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from 'src/provider/entities/provider.entity';
import { Category } from '../category/entities/category.entity';
import { City } from '../city/entities/city.entity';
import { Listing } from './entities/listing.entity';
import { ListingResolver } from './listing.resolver';
import { ListingService } from './listing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, Provider, Category, City])],
  providers: [ListingResolver, ListingService],
  exports: [ListingService],
})
export class ListingModule {}
