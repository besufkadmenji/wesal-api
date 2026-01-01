import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CityService } from './city.service';
import { City } from './entities/city.entity';
import { CreateCityInput } from './dto/create-city.input';
import { UpdateCityInput } from './dto/update-city.input';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CityPaginationInput } from './dto/city-pagination.input';
import { PaginatedCityResponse } from './dto/paginated-city.response';

@Resolver(() => City)
export class CityResolver {
  constructor(private readonly cityService: CityService) {}

  @Mutation(() => City)
  createCity(
    @Args('input') createCityInput: CreateCityInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.cityService.create(createCityInput, language);
  }

  @Query(() => PaginatedCityResponse, {
    name: 'cities',
    description: 'Get all cities with pagination',
  })
  findAll(
    @Args('pagination', { nullable: true }) pagination?: CityPaginationInput,
  ) {
    return this.cityService.findAll(pagination);
  }

  @Query(() => PaginatedCityResponse, {
    name: 'citiesByCountry',
    description: 'Get cities by country with pagination',
  })
  findByCountry(
    @Args('countryId', { type: () => ID }) countryId: string,
    @Args('pagination', { nullable: true }) pagination?: CityPaginationInput,
  ) {
    return this.cityService.findByCountry(countryId, pagination);
  }

  @Query(() => City, { name: 'city' })
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.cityService.findOne(id, language);
  }

  @Mutation(() => City)
  updateCity(
    @Args('input') updateCityInput: UpdateCityInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.cityService.update(
      updateCityInput.id,
      updateCityInput,
      language,
    );
  }

  @Mutation(() => City)
  removeCity(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.cityService.remove(id, language);
  }
}
