import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../category/entities/category.entity';
import { Listing } from '../listing/entities/listing.entity';
import { SearchService } from './search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Listing])],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
