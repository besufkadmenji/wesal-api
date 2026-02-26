import { registerEnumType } from '@nestjs/graphql';

export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

// Register enum for GraphQL
registerEnumType(ProviderStatus, {
  name: 'ProviderStatus',
  description: 'Provider status enumeration',
});
