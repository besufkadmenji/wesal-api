import { registerEnumType } from '@nestjs/graphql';

export enum AdminPermissionType {
  ADMINISTRATOR = 'ADMINISTRATOR',
  MODERATOR = 'MODERATOR',
  VIEWER = 'VIEWER',
}

registerEnumType(AdminPermissionType, {
  name: 'AdminPermissionType',
  description: 'Admin permission types',
});