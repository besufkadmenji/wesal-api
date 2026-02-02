import { registerEnumType } from '@nestjs/graphql';

export enum ProviderStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
  DEACTIVATED = 'DEACTIVATED',
}

// Register enum for GraphQL
registerEnumType(ProviderStatus, {
  name: 'ProviderStatus',
  description: 'Provider status enumeration',
});
