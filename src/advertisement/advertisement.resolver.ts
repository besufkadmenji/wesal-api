import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { AdvertisementService } from './advertisement.service';
import { Advertisement } from './entities/advertisement.entity';
import { CreateAdvertisementInput } from './dto/create-advertisement.input';
import { UpdateAdvertisementInput } from './dto/update-advertisement.input';
import { AdvertisementPaginationInput } from './dto/advertisement-pagination.input';
import { PaginatedAdvertisementResponse } from './dto/paginated-advertisement.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Advertisement)
export class AdvertisementResolver {
  constructor(private readonly advertisementService: AdvertisementService) {}

  @Mutation(() => Advertisement)
  async createAdvertisement(
    @Args('input') createAdvertisementInput: CreateAdvertisementInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Advertisement> {
    return this.advertisementService.create(createAdvertisementInput, language);
  }

  @Query(() => PaginatedAdvertisementResponse, { name: 'advertisements' })
  async findAll(
    @Args('input', { nullable: true }) input?: AdvertisementPaginationInput,
  ): Promise<IPaginatedType<Advertisement>> {
    return this.advertisementService.findAll(input ?? {});
  }

  @Query(() => Advertisement, { name: 'advertisement' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Advertisement> {
    return this.advertisementService.findOne(id, language);
  }

  @Mutation(() => Advertisement)
  async updateAdvertisement(
    @Args('input') updateAdvertisementInput: UpdateAdvertisementInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Advertisement> {
    return this.advertisementService.update(updateAdvertisementInput, language);
  }

  @Mutation(() => Advertisement)
  async removeAdvertisement(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Advertisement> {
    return this.advertisementService.remove(id, language);
  }
}
