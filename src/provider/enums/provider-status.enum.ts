import { registerEnumType } from '@nestjs/graphql';

export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

/**
 * Statuses the admin Providers list shows by default; the dashboard's
 * provider total counts the same accounts (ClickUp 869fn0tyd).
 */
export const LISTED_PROVIDER_STATUSES = [
  ProviderStatus.ACTIVE,
  ProviderStatus.INACTIVE,
  ProviderStatus.SUSPENDED,
];

// Register enum for GraphQL
registerEnumType(ProviderStatus, {
  name: 'ProviderStatus',
  description: 'Provider status enumeration',
});
