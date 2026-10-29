import { registerEnumType } from '@nestjs/graphql';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  DELETED = 'DELETED',
}

/**
 * Statuses the admin Users list shows by default; the dashboard's customer
 * total counts the same accounts (ClickUp 869fn0tyd).
 */
export const LISTED_USER_STATUSES = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.SUSPENDED,
];

registerEnumType(UserStatus, {
  name: 'UserStatus',
  description: 'User account status',
});
