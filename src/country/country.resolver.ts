import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CountryService } from './country.service';
import { Country } from './entities/country.entity';
import { CreateCountryInput } from './dto/create-country.input';
import { UpdateCountryInput } from './dto/update-country.input';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CountryPaginationInput } from './dto/country-pagination.input';
import { PaginatedCountryResponse } from './dto/paginated-country.response';

@Resolver(() => Country)
export class CountryResolver {
  constructor(private readonly countryService: CountryService) {}

  @Mutation(() => Country)
  createCountry(
    @Args('input') createCountryInput: CreateCountryInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.countryService.create(createCountryInput, language);
  }

  @Query(() => PaginatedCountryResponse, {
    name: 'countries',
    description: 'Get all countries with pagination',
  })
  findAll(
    @Args('pagination', { nullable: true }) pagination?: CountryPaginationInput,
  ) {
    return this.countryService.findAll(pagination);
  }

  @Query(() => Country, { name: 'country' })
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.countryService.findOne(id, language);
  }

  @Mutation(() => Country)
  updateCountry(
    @Args('input') updateCountryInput: UpdateCountryInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.countryService.update(
      updateCountryInput.id,
      updateCountryInput,
      language,
    );
  }

  @Mutation(() => Country)
  removeCountry(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.countryService.remove(id, language);
  }
}
