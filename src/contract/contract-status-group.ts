import { registerEnumType } from '@nestjs/graphql';
import { ContractStatus } from './enums/contract-status.enum';

/**
 * S4-1: the 7 My Contracts tabs from the BRD/Figma ("All" is no filter).
 * Every API status belongs to one tab; DRAFT is never listed.
 */
export enum ContractStatusGroup {
  PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_DELIVERY = 'IN_DELIVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(ContractStatusGroup, {
  name: 'ContractStatusGroup',
  description: 'My Contracts tab a contract status belongs to (BRD/Figma)',
});

export const CONTRACT_STATUS_GROUPS: Record<
  ContractStatus,
  ContractStatusGroup | null
> = {
  [ContractStatus.DRAFT]: null,
  [ContractStatus.PENDING]: ContractStatusGroup.PENDING_ACCEPTANCE,
  // The customer can edit and resend, so it stays with pending acceptance.
  [ContractStatus.REJECTED]: ContractStatusGroup.PENDING_ACCEPTANCE,
  [ContractStatus.ACCEPTED]: ContractStatusGroup.PENDING_PAYMENT,
  [ContractStatus.IN_PROGRESS]: ContractStatusGroup.IN_PROGRESS,
  [ContractStatus.AWAITING_CUSTOMER_CONFIRMATION]:
    ContractStatusGroup.IN_PROGRESS,
  // D-4 default: held funds stay "in progress" with an "Under review" pill.
  [ContractStatus.CANCELLATION_REQUESTED]: ContractStatusGroup.IN_PROGRESS,
  [ContractStatus.DISPUTED]: ContractStatusGroup.IN_PROGRESS,
  [ContractStatus.DELIVERY_IN_PROGRESS]: ContractStatusGroup.IN_DELIVERY,
  [ContractStatus.COMPLETED]: ContractStatusGroup.COMPLETED,
  // Finished, but without the customer's signature: its own pill (decision 2026-10-19).
  [ContractStatus.ADMIN_RESOLVED]: ContractStatusGroup.COMPLETED,
  [ContractStatus.CANCELLED]: ContractStatusGroup.CANCELLED,
};

export const statusesInGroup = (group: ContractStatusGroup): ContractStatus[] =>
  (Object.keys(CONTRACT_STATUS_GROUPS) as ContractStatus[]).filter(
    (status) => CONTRACT_STATUS_GROUPS[status] === group,
  );
