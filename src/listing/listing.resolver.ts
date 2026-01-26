import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateListingInput } from './dto/create-listing.input';
import { PaginatedListingResponse } from './dto/paginated-listings.response';
import { RemoveListingResponse } from './dto/remove-listing.response';
import { UpdateListingInput } from './dto/update-listing.input';
import { ListingPaginationInput } from './dto/listing-pagination.input';
import { Listing } from './entities/listing.entity';
import { ListingService } from './listing.service';

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

  @Query(() => PaginatedListingResponse, { name: 'listings' })
  async findAll(
    @Args('paginationInput') paginationInput: ListingPaginationInput,
  ) {
    return this.listingService.findAll(paginationInput);
  }

  @Query(() => Listing, { name: 'listing', nullable: true })
  async findOne(
    @Args('id', { type: () => String }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.listingService.findOne(id, language);
  }

  @Query(() => PaginatedListingResponse, { name: 'myListings' })
  @UseGuards(JwtAuthGuard)
  async findByUser(
    @CurrentUser() user: JwtPayload,
    @Args('paginationInput') paginationInput: ListingPaginationInput,
  ) {
    return this.listingService.findByUser(user.sub, paginationInput);
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
