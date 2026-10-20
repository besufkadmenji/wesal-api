import { registerEnumType } from '@nestjs/graphql';

export enum SignedContractStatus {
  ACTIVE = 'ACTIVE',
  TERMINATED_BY_PROVIDER = 'TERMINATED_BY_PROVIDER',
  TERMINATED_BY_ADMIN = 'TERMINATED_BY_ADMIN',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  // S4-58: the provider asked the admin to terminate (BRD e-contract page).
  TERMINATION_REQUESTED = 'TERMINATION_REQUESTED',
}

registerEnumType(SignedContractStatus, {
  name: 'SignedContractStatus',
  description: 'Provider e-contract status',
});
