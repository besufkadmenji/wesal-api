import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from 'src/provider/entities/provider.entity';
import { Category } from '../category/entities/category.entity';
import { City } from '../city/entities/city.entity';
import { Complaint } from '../complaint/entities/complaint.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { Favorite } from '../favorite/entities/favorite.entity';
import { Rating } from '../rating/entities/rating.entity';
import { Listing } from './entities/listing.entity';
import { ListingResolver } from './listing.resolver';
import { ListingService } from './listing.service';
import { ListingController } from './listing.controller';
import { TrackingModule } from '../tracking/tracking.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, Provider, Category, City, Complaint, Conversation, Favorite, Rating]),
    TrackingModule,
    SearchModule,
  ],
  controllers: [ListingController],
  providers: [ListingResolver, ListingService],
  exports: [ListingService],
})
export class ListingModule {}
