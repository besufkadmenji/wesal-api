import { Contract } from './entities/contract.entity';
import { ContractStatus } from './enums/contract-status.enum';

/**
 * Overdue rules (BRD 4.1.16 / 4.2.18 notes; D-6 default until the PO answers):
 * - provider: still IN_PROGRESS after the execution hours plus 24 h since
 *   payment. This also lets the customer cancel with a full refund (4.1.18).
 * - customer: the confirmation deadline (delivery hours plus the 24 h grace,
 *   set when the provider completes) has passed without completion.
 */
export const OVERDUE_GRACE_HOURS = 24;
const HOUR_MS = 3_600_000;

export const CUSTOMER_OVERDUE_STATUSES = [
  ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
  ContractStatus.DELIVERY_IN_PROGRESS,
];

type OverdueFields = Pick<
  Contract,
  'status' | 'paidAt' | 'executionHours' | 'confirmationDeadlineAt'
>;

export const providerDeadline = (contract: OverdueFields): Date | null => {
  if (!contract.paidAt || contract.executionHours == null) return null;
  return new Date(
    new Date(contract.paidAt).getTime() +
      (Number(contract.executionHours) + OVERDUE_GRACE_HOURS) * HOUR_MS,
  );
};

export const isProviderOverdue = (
  contract: OverdueFields,
  now: Date = new Date(),
): boolean => {
  if (contract.status !== ContractStatus.IN_PROGRESS) return false;
  const deadline = providerDeadline(contract);
  return deadline !== null && deadline.getTime() <= now.getTime();
};

export const isCustomerOverdue = (
  contract: OverdueFields,
  now: Date = new Date(),
): boolean =>
  CUSTOMER_OVERDUE_STATUSES.includes(contract.status) &&
  contract.confirmationDeadlineAt != null &&
  new Date(contract.confirmationDeadlineAt).getTime() <= now.getTime();

/** The deadline that made a contract overdue, for oldest-first ordering. */
export const overdueSince = (contract: OverdueFields): Date | null =>
  contract.status === ContractStatus.IN_PROGRESS
    ? providerDeadline(contract)
    : contract.confirmationDeadlineAt;

/**
 * SQL for the same rules (alias `contract`), so the job and the query agree
 * with the helpers above. `:now` must be bound by the caller.
 */
export const PROVIDER_OVERDUE_SQL =
  `contract.status = '${ContractStatus.IN_PROGRESS}' AND contract.paidAt IS NOT NULL ` +
  `AND contract.executionHours IS NOT NULL ` +
  `AND contract.paidAt + make_interval(hours => contract.executionHours + ${OVERDUE_GRACE_HOURS}) <= :now`;

export const CUSTOMER_OVERDUE_SQL =
  `contract.status IN (${CUSTOMER_OVERDUE_STATUSES.map((status) => `'${status}'`).join(', ')}) ` +
  `AND contract.confirmationDeadlineAt IS NOT NULL AND contract.confirmationDeadlineAt <= :now`;
