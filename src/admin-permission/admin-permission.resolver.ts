import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminPermissionService } from './admin-permission.service';
import { AdminPermission } from './entities/admin-permission.entity';
import { AssignPermissionInput } from './dto/assign-permission.input';
import { BulkAssignPermissionsInput } from './dto/bulk-assign-permissions.input';
import { GetLanguage } from 'lib/i18n/get-language.decorator';
import type { LanguageCode } from 'lib/i18n/language.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Resolver(() => AdminPermission)
export class AdminPermissionResolver {
  constructor(
    private readonly adminPermissionService: AdminPermissionService,
  ) {}

  @Mutation(() => AdminPermission)
  @UseGuards(JwtAuthGuard)
  assignPermissionToAdmin(
    @Args('input') assignPermissionInput: AssignPermissionInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminPermissionService.assign(assignPermissionInput, language);
  }

  @Query(() => [AdminPermission], { name: 'adminPermissions' })
  @UseGuards(JwtAuthGuard)
  findAdminPermissions(@Args('adminId', { type: () => ID }) adminId: string) {
    return this.adminPermissionService.findAdminPermissions(adminId);
  }

  @Query(() => [AdminPermission], { name: 'permissionAdmins' })
  @UseGuards(JwtAuthGuard)
  findPermissionAdmins(
    @Args('permissionId', { type: () => ID }) permissionId: string,
  ) {
    return this.adminPermissionService.findPermissionAdmins(permissionId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  revokePermissionFromAdmin(
    @Args('adminId', { type: () => ID }) adminId: string,
    @Args('permissionId', { type: () => ID }) permissionId: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminPermissionService.revoke(adminId, permissionId, language);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  revokeAllPermissionsFromAdmin(
    @Args('adminId', { type: () => ID }) adminId: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminPermissionService.revokeAll(adminId, language);
  }

  @Mutation(() => [AdminPermission])
  @UseGuards(JwtAuthGuard)
  bulkAssignPermissionsToAdmin(
    @Args('input') input: BulkAssignPermissionsInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminPermissionService.bulkAssign(
      input.adminId,
      input.permissionIds,
      language,
    );
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  bulkRevokePermissionsFromAdmin(
    @Args('adminId', { type: () => ID }) adminId: string,
    @Args('permissionIds', { type: () => [ID] }) permissionIds: string[],
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminPermissionService.bulkRevoke(
      adminId,
      permissionIds,
      language,
    );
  }
}
