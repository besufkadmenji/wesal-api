import { Global, Module } from '@nestjs/common';
import { AdminPermissionGuard } from '../../src/admin/guards/admin-permission.guard';

/**
 * Shared module that provides AdminPermissionGuard.
 * Import this in any feature module whose resolver methods use @RequirePermission.
 */
@Global()
@Module({
  providers: [AdminPermissionGuard],
  exports: [AdminPermissionGuard],
})
export class AdminPermissionGuardModule {}
