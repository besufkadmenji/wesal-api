import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Admin } from './entities/admin.entity';
import { CreateAdminInput } from './dto/create-admin.input';
import { UpdateAdminInput } from './dto/update-admin.input';
import { DeactivateAdminInput } from './dto/deactivate-admin.input';
import { AdminPaginationInput } from './dto/admin-pagination.input';
import { PaginatedAdminResponse } from './dto/paginated-admin.response';
import { GetLanguage } from 'lib/i18n/get-language.decorator';
import type { LanguageCode } from 'lib/i18n/language.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Resolver(() => Admin)
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  @Mutation(() => Admin)
  @UseGuards(JwtAuthGuard)
  createAdmin(
    @Args('createAdminInput') createAdminInput: CreateAdminInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminService.create(createAdminInput, language);
  }

  @Query(() => PaginatedAdminResponse, { name: 'admins' })
  @UseGuards(JwtAuthGuard)
  findAll(
    @Args('paginationInput', { nullable: true })
    paginationInput?: AdminPaginationInput,
  ) {
    return this.adminService.findAll(paginationInput);
  }

  @Query(() => Admin, { name: 'admin' })
  @UseGuards(JwtAuthGuard)
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminService.findOne(id, language);
  }

  @Mutation(() => Admin)
  @UseGuards(JwtAuthGuard)
  updateAdmin(
    @Args('id', { type: () => ID }) id: string,
    @Args('updateAdminInput') updateAdminInput: UpdateAdminInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminService.update(id, updateAdminInput, language);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  removeAdmin(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminService.remove(id, language);
  }

  @Mutation(() => Admin)
  @UseGuards(JwtAuthGuard)
  activateAdmin(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminService.activate(id, language);
  }

  @Mutation(() => Admin)
  @UseGuards(JwtAuthGuard)
  deactivateAdmin(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeactivateAdminInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminService.deactivate(id, input.reason, language);
  }
}
