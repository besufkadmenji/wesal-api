import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryService } from './category.service';
import { CategoryResolver } from './category.resolver';
import { CategoryController } from './category.controller';
import { Category } from './entities/category.entity';
import { Listing } from '../listing/entities/listing.entity';
import { TrackingModule } from '../tracking/tracking.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Listing]),
    TrackingModule,
    SearchModule,
  ],
  controllers: [CategoryController],
  providers: [CategoryResolver, CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
