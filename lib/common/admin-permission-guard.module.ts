import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermission } from '../../src/admin-permission/entities/admin-permission.entity';
import { AdminPermissionGuard } from '../../src/admin/guards/admin-permission.guard';

/**
 * Shared module that provides AdminPermissionGuard.
 * Import this in any feature module whose resolver methods use @RequirePermission.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AdminPermission])],
  providers: [AdminPermissionGuard],
  exports: [AdminPermissionGuard],
})
export class AdminPermissionGuardModule {}
