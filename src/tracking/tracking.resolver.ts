import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { TrackActionInput } from './dto/track-action.input';
import { Tracking } from './entities/tracking.entity';
import { TrackingService } from './tracking.service';

@Resolver(() => Tracking)
export class TrackingResolver {
  constructor(private readonly trackingService: TrackingService) {}

  @Mutation(() => Tracking)
  @UseGuards(JwtAuthGuard)
  async trackAction(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: TrackActionInput,
  ): Promise<Tracking> {
    return this.trackingService.trackAction(user.sub, input);
  }

  @Query(() => [String])
  @UseGuards(JwtAuthGuard)
  async myPopularCategories(
    @CurrentUser() user: JwtPayload,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<string[]> {
    const popular = await this.trackingService.getPopularCategories(
      user.sub,
      limit,
    );
    return popular.map((p) => p.categoryId);
  }

  @Query(() => [String])
  @UseGuards(JwtAuthGuard)
  async myPopularListings(
    @CurrentUser() user: JwtPayload,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<string[]> {
    const popular = await this.trackingService.getPopularListings(
      user.sub,
      limit,
    );
    return popular.map((p) => p.listingId);
  }
}
