import { registerEnumType } from '@nestjs/graphql';

export enum AdminStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

registerEnumType(AdminStatus, {
  name: 'AdminStatus',
  description: 'Admin account status',
});