import { registerEnumType } from '@nestjs/graphql';

export enum AdminStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

registerEnumType(AdminStatus, {
  name: 'AdminStatus',
  description: 'Admin account status',
});
