import { registerEnumType } from '@nestjs/graphql';

export enum AdminUserType {
  PLATFORM = 'PLATFORM',
  ORGANIZATION = 'ORGANIZATION',
}

registerEnumType(AdminUserType, {
  name: 'AdminUserType',
  description: 'Admin user types',
});
