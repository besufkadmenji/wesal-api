import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { CityResolver } from './city.resolver';
import { CityService } from './city.service';
import { City } from './entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([City, User])],
  providers: [CityResolver, CityService],
  exports: [CityService],
})
export class CityModule {}
