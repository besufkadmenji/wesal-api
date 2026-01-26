import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ListingService } from './listing.service';
import { Listing } from './entities/listing.entity';
import { CreateListingInput } from './dto/create-listing.input';
import { UpdateListingInput } from './dto/update-listing.input';
import { RemoveListingResponse } from './dto/remove-listing.response';
import { PaginatedListingsResponse } from './dto/paginated-listings.response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import type { LanguageCode } from '../../lib/i18n/language.types';

@Resolver(() => Listing)
export class ListingResolver {
  constructor(private readonly listingService: ListingService) {}

  @Mutation(() => Listing)
  @UseGuards(JwtAuthGuard)
  async createListing(
    @Args('createListingInput') createListingInput: CreateListingInput,
    @CurrentUser() user: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.listingService.create(createListingInput, user.sub, language);
  }

  @Query(() => PaginatedListingsResponse, { name: 'listings' })
  async findAll(
    @Args('skip', { type: () => Int, nullable: true }) skip = 0,
    @Args('take', { type: () => Int, nullable: true }) take = 10,
  ) {
    return this.listingService.findAll(skip, take);
  }

  @Query(() => Listing, { name: 'listing', nullable: true })
  async findOne(
    @Args('id', { type: () => String }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.listingService.findOne(id, language);
  }

  @Query(() => PaginatedListingsResponse, { name: 'myListings' })
  @UseGuards(JwtAuthGuard)
  async findByUser(
    @CurrentUser() user: JwtPayload,
    @Args('skip', { type: () => Int, nullable: true }) skip = 0,
    @Args('take', { type: () => Int, nullable: true }) take = 10,
  ) {
    return this.listingService.findByUser(user.sub, skip, take);
  }

  @Mutation(() => Listing)
  @UseGuards(JwtAuthGuard)
  async updateListing(
    @Args('updateListingInput') updateListingInput: UpdateListingInput,
    @CurrentUser() user: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.listingService.update(
      updateListingInput.id,
      updateListingInput,
      user.sub,
      language,
    );
  }

  @Mutation(() => RemoveListingResponse)
  @UseGuards(JwtAuthGuard)
  async removeListing(
    @Args('id', { type: () => String }) id: string,
    @CurrentUser() user: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.listingService.remove(id, user.sub, language);
  }
}
