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
  /**
   * The administration paid the provider without the customer's completion
   * signature (dispute or overdue confirmation). Never "Completed".
   */
  ADMIN_RESOLVED = 'ADMIN_RESOLVED',
}

registerEnumType(ContractStatus, {
  name: 'ContractStatus',
  description: 'Contract status',
});
