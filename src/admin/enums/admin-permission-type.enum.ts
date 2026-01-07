import { registerEnumType } from '@nestjs/graphql';

export enum AdminPermissionType {
  ADMINISTRATOR = 'ADMINISTRATOR',
  MODERATOR = 'MODERATOR',
  VIEWER = 'VIEWER',
  CUSTOM = 'CUSTOM',
}

registerEnumType(AdminPermissionType, {
  name: 'AdminPermissionType',
  description: 'Admin permission types',
});
