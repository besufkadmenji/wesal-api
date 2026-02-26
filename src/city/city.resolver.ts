import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CityService } from './city.service';
import { City } from './entities/city.entity';
import { CreateCityInput } from './dto/create-city.input';
import { UpdateCityInput } from './dto/update-city.input';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CityPaginationInput } from './dto/city-pagination.input';
import { PaginatedCityResponse } from './dto/paginated-city.response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';

@Resolver(() => City)
export class CityResolver {
  constructor(private readonly cityService: CityService) {}

  @Mutation(() => City)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('city', 'create')
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
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Args('pagination', { nullable: true }) pagination?: CityPaginationInput,
    @CurrentUser() user?: JwtPayload,
  ) {
    const isAdmin = !!user && !user.type;
    return this.cityService.findAll(pagination, isAdmin);
  }

  @Query(() => PaginatedCityResponse, {
    name: 'citiesByCountry',
    description: 'Get cities by country with pagination',
  })
  @UseGuards(OptionalJwtAuthGuard)
  findByCountry(
    @Args('countryId', { type: () => ID }) countryId: string,
    @Args('pagination', { nullable: true }) pagination?: CityPaginationInput,
    @CurrentUser() user?: JwtPayload,
  ) {
    const isAdmin = !!user && !user.type;
    return this.cityService.findByCountry(countryId, pagination, isAdmin);
  }

  @Query(() => City, { name: 'city' })
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
    @CurrentUser() user?: JwtPayload,
  ) {
    const isAdmin = !!user && !user.type;
    return this.cityService.findOne(id, language, isAdmin);
  }

  @Mutation(() => City)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('city', 'update')
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
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('city', 'delete')
  removeCity(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.cityService.remove(id, language);
  }

  @Mutation(() => City)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('city', 'update')
  async activateCity(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<City> {
    return this.cityService.activate(id, language);
  }

  @Mutation(() => City)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('city', 'update')
  async deactivateCity(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<City> {
    return this.cityService.deactivate(id, language);
  }
}
