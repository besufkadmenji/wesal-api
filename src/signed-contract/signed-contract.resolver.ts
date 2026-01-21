import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SignedContract } from './signed-contract.entity';
import { SignedContractService } from './signed-contract.service';
import { SignedContractPaginationInput } from './dto/signed-contract-pagination.input';
import { PaginatedSignedContractResponse } from './dto/paginated-signed-contract.response';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

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

  @Mutation(() => SignedContract)
  async deleteSignedContract(@Args('id') id: string) {
    return this.signedContractService.delete(id);
  }
}
