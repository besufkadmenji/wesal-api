import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountryService } from './country.service';
import { CountryResolver } from './country.resolver';
import { CountryController } from './country.controller';
import { Country } from './entities/country.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Country])],
  controllers: [CountryController],
  providers: [CountryResolver, CountryService],
  exports: [CountryService],
})
export class CountryModule {}
