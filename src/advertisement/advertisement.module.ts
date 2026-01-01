import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertisementService } from './advertisement.service';
import { AdvertisementResolver } from './advertisement.resolver';
import { Advertisement } from './entities/advertisement.entity';
import { AdvertisementMedia } from './entities/advertisement-media.entity';
import { AdvertisementAttributes } from './entities/advertisement-attributes.entity';
import { User } from '../user/entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { City } from '../city/entities/city.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Advertisement,
      AdvertisementMedia,
      AdvertisementAttributes,
      User,
      Category,
      City,
    ]),
  ],
  providers: [AdvertisementResolver, AdvertisementService],
  exports: [AdvertisementService],
})
export class AdvertisementModule {}
