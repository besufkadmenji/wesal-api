import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ContractService } from './contract.service';
import { Contract } from './entities/contract.entity';
import { CreateContractInput } from './dto/create-contract.input';
import { ContractPaginationInput } from './dto/contract-pagination.input';
import { PaginatedContractResponse } from './dto/paginated-contract.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ContractQuoteInput } from './dto/contract-quote.input';
import { ContractQuote } from './dto/contract-quote.response';
import { AcceptContractInput } from './dto/accept-contract.input';
import { RejectContractInput } from './dto/reject-contract.input';
import { ResendContractInput } from './dto/resend-contract.input';

@Resolver(() => Contract)
@UseGuards(JwtAuthGuard)
export class ContractResolver {
  constructor(private readonly contractService: ContractService) {}

  @Mutation(() => Contract)
  async createContract(
    @Args('input') createContractInput: CreateContractInput,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.create(
      createContractInput,
      principal,
      language,
    );
  }

  @Query(() => PaginatedContractResponse, { name: 'contracts' })
  async findAll(
    @CurrentPrincipal() principal: JwtPayload,
    @Args('input', { nullable: true }) input?: ContractPaginationInput,
  ): Promise<IPaginatedType<Contract>> {
    return this.contractService.findAll(input ?? {}, principal);
  }

  @Query(() => Contract, { name: 'contract' })
  async findOne(
    @Args('id') id: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.findOne(id, principal, language);
  }

  @Query(() => ContractQuote, {
    name: 'contractQuote',
    description: 'Preview server-calculated contract financial terms',
  })
  async quote(
    @Args('input') input: ContractQuoteInput,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<ContractQuote> {
    return this.contractService.quote(input, principal, language);
  }

  @Mutation(() => Contract, {
    description: 'Provider accepts a pending contract',
  })
  async acceptContract(
    @Args('input') input: AcceptContractInput,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.acceptContract(input, principal, language);
  }

  @Mutation(() => Contract, {
    description: 'Provider rejects a pending contract',
  })
  async rejectContract(
    @Args('input') input: RejectContractInput,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.rejectContract(input, principal, language);
  }

  @Mutation(() => Contract, {
    description: 'Customer resends a rejected contract as a new version',
  })
  async resendContract(
    @Args('input') input: ResendContractInput,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Contract> {
    return this.contractService.resendContract(input, principal, language);
  }
}
