import {
  cancellationOutcome,
  earlyCancellationSplit,
} from './cancellation-outcome';
import { Contract } from './entities/contract.entity';
import { CancellationOutcome } from './enums/cancellation-outcome.enum';
import { ContractStatus } from './enums/contract-status.enum';

const HOUR = 3_600_000;
const now = new Date('2026-10-19T12:00:00Z');
const contract = (overrides: Partial<Contract>) =>
  ({
    status: ContractStatus.IN_PROGRESS,
    totalPayable: 345,
    downPayment: 30,
    commissionAmount: 6,
    executionHours: 24,
    paidAt: new Date(now.getTime() - 10 * HOUR),
    confirmationDeadlineAt: null,
    ...overrides,
  }) as Contract;

describe('cancellationOutcome (BRD 4.1.18)', () => {
  it('charges nothing before payment', () => {
    for (const status of [
      ContractStatus.DRAFT,
      ContractStatus.PENDING,
      ContractStatus.ACCEPTED,
    ]) {
      expect(cancellationOutcome(contract({ status }), now)).toEqual({
        outcome: CancellationOutcome.NO_CHARGE,
        refundAmount: 0,
        providerAmount: 0,
      });
    }
  });

  it('refunds paid minus deposit while the provider is within time', () => {
    expect(cancellationOutcome(contract({}), now)).toEqual({
      outcome: CancellationOutcome.PARTIAL_REFUND,
      refundAmount: 315,
      providerAmount: 24,
    });
  });

  it('refunds everything once the provider is past execution + 24 h', () => {
    const late = (hoursAgo: number) =>
      contract({ paidAt: new Date(now.getTime() - hoursAgo * HOUR) });
    expect(cancellationOutcome(late(47), now).outcome).toBe(
      CancellationOutcome.PARTIAL_REFUND,
    );
    expect(cancellationOutcome(late(48), now)).toEqual({
      outcome: CancellationOutcome.FULL_REFUND,
      refundAmount: 345,
      providerAmount: 0,
    });
  });

  it('holds the money once the provider has completed', () => {
    for (const status of [
      ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
      ContractStatus.DELIVERY_IN_PROGRESS,
    ]) {
      expect(cancellationOutcome(contract({ status }), now).outcome).toBe(
        CancellationOutcome.HELD,
      );
    }
  });

  it('cannot cancel a finished contract', () => {
    for (const status of [
      ContractStatus.COMPLETED,
      ContractStatus.CANCELLED,
      ContractStatus.DISPUTED,
      ContractStatus.ADMIN_RESOLVED,
    ]) {
      expect(cancellationOutcome(contract({ status }), now).outcome).toBe(
        CancellationOutcome.NOT_CANCELLABLE,
      );
    }
  });

  it('uses the same split the settlement writes', () => {
    // The early-cancellation settlement test pays 575 with a 50 deposit and
    // 10 commission and books 525 / 40 / 10.
    expect(earlyCancellationSplit(575, 50, 10)).toEqual({
      refund: 525,
      provider: 40,
      commission: 10,
    });
  });
});
