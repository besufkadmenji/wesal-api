import { registerEnumType } from '@nestjs/graphql';

export enum SignedContractStatus {
  ACTIVE = 'ACTIVE',
  TERMINATED_BY_USER = 'TERMINATED_BY_USER',
  TERMINATED_BY_ADMIN = 'TERMINATED_BY_ADMIN',
  EXPIRED = 'EXPIRED',
}

registerEnumType(SignedContractStatus, {
  name: 'SignedContractStatus',
  description: 'User account status',
});
