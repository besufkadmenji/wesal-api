import { registerEnumType } from '@nestjs/graphql';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  DELETED = 'DELETED',
}

registerEnumType(UserStatus, {
  name: 'UserStatus',
  description: 'User account status',
});
