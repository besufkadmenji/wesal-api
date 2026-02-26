import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('bank', 'create')
  async createBank(
    @Args('input') createBankInput: CreateBankInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.create(createBankInput, language);
  }

  @Query(() => PaginatedBankResponse, { name: 'banks' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('bank', 'read')
  async findAllBanks(
    @Args('input', { nullable: true }) input?: BankPaginationInput,
  ): Promise<IPaginatedType<Bank>> {
    return this.bankService.findAll(input);
  }

  @Query(() => Bank, { name: 'bank' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('bank', 'read')
  async findOneBank(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.findOne(id, language);
  }

  @Mutation(() => Bank)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('bank', 'update')
  async updateBank(
    @Args('input') updateBankInput: UpdateBankInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.update(updateBankInput, language);
  }

  @Mutation(() => Bank)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('bank', 'delete')
  async removeBank(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.remove(id, language);
  }

  @Mutation(() => Bank)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('bank', 'update')
  async activateBank(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.activate(id, language);
  }

  @Mutation(() => Bank)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('bank', 'update')
  async deactivateBank(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeactivateBankInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Bank> {
    return this.bankService.deactivate(id, input.reason, language);
  }
}
