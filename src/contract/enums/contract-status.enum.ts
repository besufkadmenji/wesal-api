import { registerEnumType } from '@nestjs/graphql';

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(ContractStatus, {
  name: 'ContractStatus',
  description: 'Contract status',
});
