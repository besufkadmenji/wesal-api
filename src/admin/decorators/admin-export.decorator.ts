import { applyDecorators, UseGuards } from '@nestjs/common';
import { RequirePermission } from './require-permission.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminPermissionGuard } from '../guards/admin-permission.guard';

export function AdminExport(module: string): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AdminAuthGuard, AdminPermissionGuard),
    RequirePermission(module, 'read'),
  );
}
