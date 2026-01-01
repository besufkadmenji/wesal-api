import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ContractService } from './contract.service';
import { Contract } from './entities/contract.entity';
import { CreateContractInput } from './dto/create-contract.input';
import { UpdateContractInput } from './dto/update-contract.input';
import { ContractPaginationInput } from './dto/contract-pagination.input';
import { PaginatedContractResponse } from './dto/paginated-contract.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Contract)
export class ContractResolver {
  constructor(private readonly contractService: ContractService) {}

  @Mutation(() => Contract)
  async createContract(
    @Args('input') createContractInput: CreateContractInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.create(createContractInput, language);
  }

  @Query(() => PaginatedContractResponse, { name: 'contracts' })
  async findAll(
    @Args('input', { nullable: true }) input?: ContractPaginationInput,
  ): Promise<IPaginatedType<Contract>> {
    return this.contractService.findAll(input ?? {});
  }

  @Query(() => Contract, { name: 'contract' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.findOne(id, language);
  }

  @Mutation(() => Contract)
  async updateContract(
    @Args('input') updateContractInput: UpdateContractInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.update(updateContractInput, language);
  }

  @Mutation(() => Contract)
  async removeContract(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.remove(id, language);
  }
}
