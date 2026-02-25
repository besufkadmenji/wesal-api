import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { CityResolver } from './city.resolver';
import { CityService } from './city.service';
import { CityController } from './city.controller';
import { City } from './entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([City, User, Provider])],
  controllers: [CityController],
  providers: [CityResolver, CityService],
  exports: [CityService],
})
export class CityModule {}
