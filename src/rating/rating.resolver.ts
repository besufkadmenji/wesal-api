import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { RatingService } from './rating.service';
import { Rating } from './entities/rating.entity';
import { CreateRatingInput } from './dto/create-rating.input';
import { UpdateRatingInput } from './dto/update-rating.input';
import { RatingPaginationInput } from './dto/rating-pagination.input';
import { PaginatedRatingResponse } from './dto/paginated-rating.response';
import { RatingStatistics } from './dto/rating-statistics.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Rating)
export class RatingResolver {
  constructor(private readonly ratingService: RatingService) {}

  @Mutation(() => Rating)
  async createRating(
    @Args('input') createRatingInput: CreateRatingInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Rating> {
    return this.ratingService.create(createRatingInput, language);
  }

  @Query(() => PaginatedRatingResponse, { name: 'ratings' })
  async findAll(
    @Args('input', { nullable: true }) input?: RatingPaginationInput,
  ): Promise<IPaginatedType<Rating>> {
    return this.ratingService.findAll(input ?? {});
  }

  @Query(() => Rating, { name: 'rating' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Rating> {
    return this.ratingService.findOne(id, language);
  }

  @Mutation(() => Rating)
  async updateRating(
    @Args('input') updateRatingInput: UpdateRatingInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Rating> {
    return this.ratingService.update(updateRatingInput, language);
  }

  @Mutation(() => Rating)
  async removeRating(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Rating> {
    return this.ratingService.remove(id, language);
  }

  @Query(() => RatingStatistics, {
    name: 'ratingStatistics',
    description: 'Get rating statistics for an advertisement',
  })
  async getStatistics(
    @Args('advertisementId') advertisementId: string,
  ): Promise<RatingStatistics> {
    return this.ratingService.getStatistics(advertisementId);
  }
}
