import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteService } from './favorite.service';
import { FavoriteResolver } from './favorite.resolver';
import { Favorite } from './entities/favorite.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, User, Provider])],
  providers: [FavoriteResolver, FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}
