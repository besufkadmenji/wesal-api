import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { PaginatedSignedContractResponse } from './dto/paginated-signed-contract.response';
import { SignedContractPaginationInput } from './dto/signed-contract-pagination.input';
import { SignedContract } from './signed-contract.entity';
import { SignedContractService } from './signed-contract.service';

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
  async signedContractByUserId(@Args('userId') userId: string) {
    return this.signedContractService.findByUserId(userId);
  }

  @Query(() => SignedContract, { nullable: true })
  async signedContractById(@Args('id') id: string) {
    return this.signedContractService.findById(id);
  }

  @Mutation(() => SignedContract)
  async deleteSignedContract(@Args('id') id: string) {
    return this.signedContractService.delete(id);
  }
}
