import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FavoriteService } from './favorite.service';
import { Favorite } from './entities/favorite.entity';
import { FavoritePaginationInput } from './dto/favorite-pagination.input';
import { PaginatedFavoriteResponse } from './dto/paginated-favorite.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { I18nBadRequestException } from '../../lib/errors';

@Resolver(() => Favorite)
@UseGuards(JwtAuthGuard)
export class FavoriteResolver {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Mutation(() => Boolean)
  async setProviderFavorite(
    @Args('providerId') providerId: string,
    @Args('favorite') favorite: boolean,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<boolean> {
    this.assertCustomer(principal, language);
    return this.favoriteService.setProviderFavorite(
      principal.sub,
      providerId,
      favorite,
      language,
    );
  }

  @Query(() => PaginatedFavoriteResponse, { name: 'myFavoriteProviders' })
  async findAll(
    @CurrentPrincipal() principal: JwtPayload,
    @Args('input', { nullable: true }) input?: FavoritePaginationInput,
  ): Promise<IPaginatedType<Favorite>> {
    this.assertCustomer(principal, 'en');
    return this.favoriteService.findAll(principal.sub, input ?? {});
  }

  @Query(() => Boolean, { name: 'isProviderFavorite' })
  async isFavorite(
    @Args('providerId') providerId: string,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<boolean> {
    this.assertCustomer(principal, 'en');
    return this.favoriteService.isFavorite(principal.sub, providerId);
  }

  private assertCustomer(principal: JwtPayload, language: LanguageCode): void {
    if (principal.type !== 'user') {
      throw new I18nBadRequestException(
        { en: 'Customer access required', ar: 'يلزم تسجيل الدخول كعميل' },
        language,
      );
    }
  }
}
