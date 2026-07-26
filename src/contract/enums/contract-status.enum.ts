import { registerEnumType } from '@nestjs/graphql';

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_CUSTOMER_CONFIRMATION = 'AWAITING_CUSTOMER_CONFIRMATION',
  DELIVERY_IN_PROGRESS = 'DELIVERY_IN_PROGRESS',
  CANCELLATION_REQUESTED = 'CANCELLATION_REQUESTED',
  DISPUTED = 'DISPUTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(ContractStatus, {
  name: 'ContractStatus',
  description: 'Contract status',
});
