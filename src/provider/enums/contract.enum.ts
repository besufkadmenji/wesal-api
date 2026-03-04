import { registerEnumType } from '@nestjs/graphql';

export enum SignedContractStatus {
  ACTIVE = 'ACTIVE',
  TERMINATED_BY_PROVIDER = 'TERMINATED_BY_PROVIDER',
  TERMINATED_BY_ADMIN = 'TERMINATED_BY_ADMIN',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

registerEnumType(SignedContractStatus, {
  name: 'SignedContractStatus',
  description: 'Provider account status',
});
