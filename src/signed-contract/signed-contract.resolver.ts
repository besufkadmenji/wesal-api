import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { PaginatedSignedContractResponse } from './dto/paginated-signed-contract.response';
import { SignedContractPaginationInput } from './dto/signed-contract-pagination.input';
import { SignedContract } from './signed-contract.entity';
import { SignedContractService } from './signed-contract.service';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';

@Resolver(() => SignedContract)
export class SignedContractResolver {
  constructor(private readonly signedContractService: SignedContractService) {}

  @Query(() => PaginatedSignedContractResponse, { name: 'signedContracts' })
  async signedContracts(
    @Args('input', { nullable: true })
    input?: SignedContractPaginationInput,
  ): Promise<IPaginatedType<SignedContract>> {
    return this.signedContractService.findAll(input ?? {});
  }

  @Query(() => SignedContract, { nullable: true })
  async signedContractByProviderId(@Args('providerId') providerId: string) {
    return this.signedContractService.findByProviderId(providerId);
  }

  @Query(() => SignedContract, { nullable: true })
  async signedContractById(@Args('id') id: string) {
    return this.signedContractService.findById(id);
  }

  @Mutation(() => SignedContract)
  async deleteSignedContract(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<SignedContract> {
    return this.signedContractService.delete(id, language);
  }
}
