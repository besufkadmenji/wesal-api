import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { CategoryService } from './category.service';
import { CategoryResolver } from './category.resolver';
import { CategoryController } from './category.controller';
import { Category } from './entities/category.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Provider } from '../provider/entities/provider.entity';
import { TrackingModule } from '../tracking/tracking.module';
import { SearchModule } from '../search/search.module';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Listing, Provider, AdminPermission]),
    TrackingModule,
    SearchModule,
    AdminPermissionGuardModule,
  ],
  controllers: [CategoryController],
  providers: [CategoryResolver, CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
