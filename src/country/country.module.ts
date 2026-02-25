import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountryService } from './country.service';
import { CountryResolver } from './country.resolver';
import { CountryController } from './country.controller';
import { Country } from './entities/country.entity';
import { City } from '../city/entities/city.entity';
import { Provider } from '../provider/entities/provider.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Country, City, Provider, User])],
  controllers: [CountryController],
  providers: [CountryResolver, CountryService],
  exports: [CountryService],
})
export class CountryModule {}
