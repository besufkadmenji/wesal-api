import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'admin_permission';

export interface PermissionRequirement {
  module: string;
  action: string;
}

/**
 * Decorator to declare the permission required to access a resolver field.
 * Must be paired with AdminPermissionGuard.
 *
 * @example
 * @RequirePermission('listing', 'read')
 * @UseGuards(AdminPermissionGuard)
 * async listings() { ... }
 */
export const RequirePermission = (
  module: string,
  action: string,
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_KEY, { module, action } as PermissionRequirement);
