import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { FavoriteService } from './favorite.service';
import { Favorite } from './entities/favorite.entity';
import { CreateFavoriteInput } from './dto/create-favorite.input';
import { FavoritePaginationInput } from './dto/favorite-pagination.input';
import { PaginatedFavoriteResponse } from './dto/paginated-favorite.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Favorite)
export class FavoriteResolver {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Mutation(() => Favorite)
  async createFavorite(
    @Args('input') createFavoriteInput: CreateFavoriteInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Favorite> {
    return this.favoriteService.create(createFavoriteInput, language);
  }

  @Query(() => PaginatedFavoriteResponse, { name: 'favorites' })
  async findAll(
    @Args('input', { nullable: true }) input?: FavoritePaginationInput,
  ): Promise<IPaginatedType<Favorite>> {
    return this.favoriteService.findAll(input ?? {});
  }

  @Query(() => Favorite, { name: 'favorite' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Favorite> {
    return this.favoriteService.findOne(id, language);
  }

  @Mutation(() => Favorite)
  async removeFavorite(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Favorite> {
    return this.favoriteService.remove(id, language);
  }

  @Mutation(() => Favorite, {
    description: 'Remove favorite by user and advertisement IDs',
  })
  async removeFavoriteByUserAndAdvertisement(
    @Args('userId') userId: string,
    @Args('advertisementId') advertisementId: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Favorite> {
    return this.favoriteService.removeByUserAndAdvertisement(
      userId,
      advertisementId,
      language,
    );
  }

  @Query(() => Boolean, {
    name: 'isFavorite',
    description: 'Check if advertisement is favorited by user',
  })
  async isFavorite(
    @Args('userId') userId: string,
    @Args('advertisementId') advertisementId: string,
  ): Promise<boolean> {
    return this.favoriteService.isFavorite(userId, advertisementId);
  }
}
