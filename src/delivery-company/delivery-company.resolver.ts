import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { DeliveryCompanyService } from './delivery-company.service';
import { DeliveryCompanyPaginationInput } from './dto/delivery-company-pagination.input';
import { CreateDeliveryCompanyInput } from './dto/create-delivery-company.input';
import { DeactivateDeliveryCompanyInput } from './dto/deactivate-delivery-company.input';
import { PaginatedDeliveryCompanyResponse } from './dto/paginated-delivery-company.response';
import { UpdateDeliveryCompanyInput } from './dto/update-delivery-company.input';
import { DeliveryCompany } from './entities/delivery-company.entity';

@Resolver(() => DeliveryCompany)
export class DeliveryCompanyResolver {
  constructor(
    private readonly deliveryCompanyService: DeliveryCompanyService,
  ) {}

  @Mutation(() => DeliveryCompany)
  async createDeliveryCompany(
    @Args('input') createDeliveryCompanyInput: CreateDeliveryCompanyInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<DeliveryCompany> {
    return this.deliveryCompanyService.create(
      createDeliveryCompanyInput,
      language,
    );
  }

  @Query(() => PaginatedDeliveryCompanyResponse, { name: 'deliveryCompanies' })
  async findAllDeliveryCompanies(
    @Args('input', { nullable: true }) input?: DeliveryCompanyPaginationInput,
  ): Promise<IPaginatedType<DeliveryCompany>> {
    return this.deliveryCompanyService.findAll(input);
  }

  @Query(() => DeliveryCompany, { name: 'deliveryCompany' })
  async findOneDeliveryCompany(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<DeliveryCompany> {
    return this.deliveryCompanyService.findOne(id, language);
  }

  @Mutation(() => DeliveryCompany)
  async updateDeliveryCompany(
    @Args('input') updateDeliveryCompanyInput: UpdateDeliveryCompanyInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<DeliveryCompany> {
    return this.deliveryCompanyService.update(
      updateDeliveryCompanyInput,
      language,
    );
  }

  @Mutation(() => DeliveryCompany)
  async removeDeliveryCompany(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<DeliveryCompany> {
    return this.deliveryCompanyService.remove(id, language);
  }

  @Mutation(() => DeliveryCompany)
  async activateDeliveryCompany(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<DeliveryCompany> {
    return this.deliveryCompanyService.activate(id, language);
  }

  @Mutation(() => DeliveryCompany)
  async deactivateDeliveryCompany(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeactivateDeliveryCompanyInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<DeliveryCompany> {
    return this.deliveryCompanyService.deactivate(id, input?.reason, language);
  }
}
