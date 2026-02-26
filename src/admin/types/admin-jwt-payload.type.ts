import type { AdminPermissionType } from '../enums/admin-permission-type.enum';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  permissionType: AdminPermissionType;
  iat?: number;
  exp?: number;
}
