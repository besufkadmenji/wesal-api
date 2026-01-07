import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';
import { CreatePermissionInput } from './dto/create-permission.input';
import { UpdatePermissionInput } from './dto/update-permission.input';
import { GetLanguage } from 'lib/i18n/get-language.decorator';
import type { LanguageCode } from 'lib/i18n/language.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Resolver(() => Permission)
export class PermissionResolver {
  constructor(private readonly permissionService: PermissionService) {}

  @Mutation(() => Permission)
  @UseGuards(JwtAuthGuard)
  createPermission(
    @Args('createPermissionInput') createPermissionInput: CreatePermissionInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.permissionService.create(createPermissionInput, language);
  }

  @Query(() => [Permission], { name: 'permissions' })
  @UseGuards(JwtAuthGuard)
  findAllPermissions() {
    return this.permissionService.findAll();
  }

  @Query(() => Permission, { name: 'permission' })
  @UseGuards(JwtAuthGuard)
  findOnePermission(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.permissionService.findOne(id, language);
  }

  @Mutation(() => Permission)
  @UseGuards(JwtAuthGuard)
  updatePermission(
    @Args('id', { type: () => ID }) id: string,
    @Args('updatePermissionInput') updatePermissionInput: UpdatePermissionInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.permissionService.update(id, updatePermissionInput, language);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  removePermission(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.permissionService.remove(id, language);
  }
}
