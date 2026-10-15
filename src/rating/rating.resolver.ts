import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { RatingService } from './rating.service';
import { Rating } from './entities/rating.entity';
import { RatingStatus } from './enums/rating-status.enum';
import { RateContractInput } from './dto/rate-contract.input';
import { RatingPaginationInput } from './dto/rating-pagination.input';
import { PaginatedRatingResponse } from './dto/paginated-rating.response';
import { RatingStatistics } from './dto/rating-statistics.response';
import { ListingReviewsInput } from './dto/listing-reviews.input';
import {
  ListingReview,
  PaginatedListingReviewResponse,
} from './dto/listing-review.response';

@Resolver(() => Rating)
export class RatingResolver {
  constructor(private readonly ratingService: RatingService) {}

  @Mutation(() => Rating, {
    description: 'Customer rates their own completed contract (once)',
  })
  @UseGuards(JwtAuthGuard)
  rateContract(
    @Args('input') input: RateContractInput,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Rating> {
    return this.ratingService.rateContract(input, principal, language);
  }

  @Query(() => PaginatedListingReviewResponse, {
    name: 'listingReviews',
    description: 'Published reviews for a listing',
  })
  listingReviews(
    @Args('input') input: ListingReviewsInput,
  ): Promise<IPaginatedType<ListingReview>> {
    return this.ratingService.listingReviews(input);
  }

  @Query(() => RatingStatistics, {
    name: 'ratingStatistics',
    description: 'Star distribution of published ratings for a listing',
  })
  getStatistics(
    @Args('listingId') listingId: string,
  ): Promise<RatingStatistics> {
    return this.ratingService.getStatistics(listingId);
  }

  @Query(() => PaginatedRatingResponse, { name: 'adminRatings' })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('rating', 'read')
  adminRatings(
    @Args('input', { nullable: true }) input?: RatingPaginationInput,
  ): Promise<IPaginatedType<Rating>> {
    return this.ratingService.findAdmin(input ?? {});
  }

  @Query(() => Rating, { name: 'adminRating' })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('rating', 'read')
  adminRating(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Rating> {
    return this.ratingService.findOne(id, language);
  }

  @Mutation(() => Rating, {
    description: 'Publish or hide a rating (hidden ratings leave the averages)',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('rating', 'update')
  adminSetRatingStatus(
    @Args('id') id: string,
    @Args('status', { type: () => RatingStatus }) status: RatingStatus,
    @CurrentAdmin() admin: AdminJwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Rating> {
    return this.ratingService.setStatus(id, status, admin, language);
  }
}
