import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SignedContract } from './signed-contract.entity';
import { SignedContractService } from './signed-contract.service';

@Resolver(() => SignedContract)
export class SignedContractResolver {
  constructor(private readonly signedContractService: SignedContractService) {}

  @Query(() => [SignedContract])
  async signedContracts() {
    return this.signedContractService.findAll();
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
