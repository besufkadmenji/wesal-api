import { registerEnumType } from '@nestjs/graphql';

export enum PermissionPlatform {
  GLOBAL = 'GLOBAL',
  ADMIN = 'ADMIN',
}

registerEnumType(PermissionPlatform, {
  name: 'PermissionPlatform',
  description: 'Permission platform types',
});
