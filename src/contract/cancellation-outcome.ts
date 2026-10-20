import { isProviderOverdue } from './contract-overdue';
import { Contract } from './entities/contract.entity';
import { CancellationOutcome } from './enums/cancellation-outcome.enum';
import { ContractStatus } from './enums/contract-status.enum';

const round = (value: number) => Math.round(Math.max(0, value) * 100) / 100;

/**
 * BRD 4.1.18 in-progress cancellation: the customer gets back what they paid
 * minus the deposit; the provider keeps the deposit minus the commission.
 * Shared by the settlement and the customer's warning, so they never differ.
 */
export const earlyCancellationSplit = (
  paid: number,
  downPayment: number,
  commissionAmount: number,
) => {
  const deposit = Math.min(Number(downPayment), paid);
  const commission = Math.min(Number(commissionAmount), deposit);
  return {
    refund: round(paid - deposit),
    provider: round(deposit - commission),
    commission: round(commission),
  };
};

export type CancellationOutcomeResult = {
  outcome: CancellationOutcome;
  refundAmount: number;
  providerAmount: number;
};

/** What cancelling (or refusing receipt) would do to the customer's money now. */
export const cancellationOutcome = (
  contract: Pick<
    Contract,
    | 'status'
    | 'paidAt'
    | 'executionHours'
    | 'confirmationDeadlineAt'
    | 'totalPayable'
    | 'downPayment'
    | 'commissionAmount'
  >,
  now: Date = new Date(),
): CancellationOutcomeResult => {
  const paid = Number(contract.totalPayable);
  switch (contract.status) {
    case ContractStatus.DRAFT:
    case ContractStatus.PENDING:
    case ContractStatus.ACCEPTED:
      return {
        outcome: CancellationOutcome.NO_CHARGE,
        refundAmount: 0,
        providerAmount: 0,
      };
    case ContractStatus.IN_PROGRESS: {
      if (isProviderOverdue(contract, now)) {
        return {
          outcome: CancellationOutcome.FULL_REFUND,
          refundAmount: round(paid),
          providerAmount: 0,
        };
      }
      const split = earlyCancellationSplit(
        paid,
        Number(contract.downPayment),
        Number(contract.commissionAmount),
      );
      return {
        outcome: CancellationOutcome.PARTIAL_REFUND,
        refundAmount: split.refund,
        providerAmount: split.provider,
      };
    }
    case ContractStatus.AWAITING_CUSTOMER_CONFIRMATION:
    case ContractStatus.DELIVERY_IN_PROGRESS:
      return {
        outcome: CancellationOutcome.HELD,
        refundAmount: 0,
        providerAmount: 0,
      };
    default:
      return {
        outcome: CancellationOutcome.NOT_CANCELLABLE,
        refundAmount: 0,
        providerAmount: 0,
      };
  }
};
