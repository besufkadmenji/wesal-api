import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { BankService } from './bank.service';
import { BankPaginationInput } from './dto/bank-pagination.input';
import { CreateBankInput } from './dto/create-bank.input';
import { DeactivateBankInput } from './dto/deactivate-bank.input';
import { PaginatedBankResponse } from './dto/paginated-bank.response';
import { UpdateBankInput } from './dto/update-bank.input';
import { Bank } from './entities/bank.entity';

@Resolver(() => Bank)
export class BankResolver {
  constructor(private readonly bankService: BankService) {}

  @Mutation(() => Bank)
  async createBank(
    @Args('input') createBankInput: CreateBankInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.create(createBankInput, language);
  }

  @Query(() => PaginatedBankResponse, { name: 'banks' })
  async findAllBanks(
    @Args('input', { nullable: true }) input?: BankPaginationInput,
  ): Promise<IPaginatedType<Bank>> {
    return this.bankService.findAll(input);
  }

  @Query(() => Bank, { name: 'bank' })
  async findOneBank(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.findOne(id, language);
  }

  @Mutation(() => Bank)
  async updateBank(
    @Args('input') updateBankInput: UpdateBankInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.update(updateBankInput, language);
  }

  @Mutation(() => Bank)
  async removeBank(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.remove(id, language);
  }

  @Mutation(() => Bank)
  async activateBank(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.activate(id, language);
  }

  @Mutation(() => Bank)
  async deactivateBank(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeactivateBankInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.deactivate(id, input.reason, language);
  }
}
