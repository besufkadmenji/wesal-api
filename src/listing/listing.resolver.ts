import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentAdmin } from 'src/admin/decorators/current-admin.decorator';
import { CurrentProvider } from 'src/auth/decorators/current-provider.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateListingInput } from './dto/create-listing.input';
import { ListingPaginationInput } from './dto/listing-pagination.input';
import { PaginatedListingResponse } from './dto/paginated-listings.response';
import { RemoveListingResponse } from './dto/remove-listing.response';
import { UpdateListingInput } from './dto/update-listing.input';
import { Listing } from './entities/listing.entity';
import { ListingService } from './listing.service';

@Resolver(() => Listing)
export class ListingResolver {
  constructor(private readonly listingService: ListingService) {}

  @Mutation(() => Listing)
  @UseGuards(JwtAuthGuard)
  async createListing(
    @Args('createListingInput') createListingInput: CreateListingInput,
    @CurrentProvider() provider: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.listingService.create(
      createListingInput,
      provider.sub,
      language,
    );
  }

  @Query(() => PaginatedListingResponse, { name: 'listings' })
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Args('paginationInput') paginationInput: ListingPaginationInput,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.listingService.findAll(paginationInput, user?.sub);
  }

  @Query(() => Listing, { name: 'listing', nullable: true })
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.listingService.findOne(id, language, user?.sub);
  }

  @Query(() => PaginatedListingResponse, { name: 'myListings' })
  @UseGuards(JwtAuthGuard)
  async findByProvider(
    @CurrentProvider() provider: JwtPayload,
    @Args('paginationInput') paginationInput: ListingPaginationInput,
  ) {
    return this.listingService.findByProvider(provider.sub, paginationInput);
  }

  @Mutation(() => Listing)
  @UseGuards(JwtAuthGuard)
  async updateListing(
    @Args('updateListingInput') updateListingInput: UpdateListingInput,
    @CurrentProvider() provider: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.listingService.update(
      updateListingInput.id,
      updateListingInput,
      provider.sub,
      language,
    );
  }

  @Mutation(() => RemoveListingResponse)
  @UseGuards(JwtAuthGuard)
  async removeListing(
    @Args('id', { type: () => ID }) id: string,
    @CurrentProvider() provider: JwtPayload,
    @CurrentAdmin() admin: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.listingService.remove(id, language, provider?.sub, admin.sub);
  }

  @Mutation(() => Listing)
  @UseGuards(JwtAuthGuard)
  async activateListing(
    @Args('id', { type: () => ID }) id: string,
    @CurrentAdmin() admin: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Listing> {
    return await this.listingService.activate(id, language, admin.sub);
  }

  @Mutation(() => Listing)
  @UseGuards(JwtAuthGuard)
  async deactivateListing(
    @Args('id', { type: () => ID }) id: string,
    @Args('reason', { type: () => String }) reason: string,
    @CurrentAdmin() admin: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Listing> {
    return await this.listingService.deactivate(
      id,
      reason,
      language,
      admin.sub,
    );
  }
}
