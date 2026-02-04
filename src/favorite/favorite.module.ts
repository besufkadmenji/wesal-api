import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteService } from './favorite.service';
import { FavoriteResolver } from './favorite.resolver';
import { FavoriteController } from './favorite.controller';
import { Favorite } from './entities/favorite.entity';
import { User } from '../user/entities/user.entity';
import { Listing } from '../listing/entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, User, Listing])],
  controllers: [FavoriteController],
  providers: [FavoriteResolver, FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}
