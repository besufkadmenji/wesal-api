import {
  isCustomerOverdue,
  isProviderOverdue,
  overdueSince,
} from './contract-overdue';
import { Contract } from './entities/contract.entity';
import { ContractStatus } from './enums/contract-status.enum';

const HOUR = 3_600_000;
const now = new Date('2026-10-19T12:00:00Z');
const contract = (overrides: Partial<Contract>) =>
  ({
    status: ContractStatus.IN_PROGRESS,
    paidAt: null,
    executionHours: null,
    confirmationDeadlineAt: null,
    ...overrides,
  }) as Contract;

describe('contract overdue rules', () => {
  it('flags the provider after execution hours plus 24 h from payment', () => {
    const paid = (hoursAgo: number) =>
      contract({
        executionHours: 10,
        paidAt: new Date(now.getTime() - hoursAgo * HOUR),
      });
    expect(isProviderOverdue(paid(33), now)).toBe(false);
    expect(isProviderOverdue(paid(34), now)).toBe(true);
    expect(overdueSince(paid(34))).toEqual(now);
  });

  it('never flags an unpaid or finished contract', () => {
    const late = {
      executionHours: 1,
      paidAt: new Date(now.getTime() - 100 * HOUR),
    };
    expect(isProviderOverdue(contract({ ...late, paidAt: null }), now)).toBe(
      false,
    );
    expect(
      isProviderOverdue(
        contract({ ...late, status: ContractStatus.COMPLETED }),
        now,
      ),
    ).toBe(false);
  });

  it('flags the customer after the confirmation deadline', () => {
    const waiting = (deadline: Date, status: ContractStatus) =>
      contract({ status, confirmationDeadlineAt: deadline });
    const past = new Date(now.getTime() - HOUR);
    const future = new Date(now.getTime() + HOUR);
    expect(
      isCustomerOverdue(
        waiting(past, ContractStatus.AWAITING_CUSTOMER_CONFIRMATION),
        now,
      ),
    ).toBe(true);
    expect(
      isCustomerOverdue(
        waiting(past, ContractStatus.DELIVERY_IN_PROGRESS),
        now,
      ),
    ).toBe(true);
    expect(
      isCustomerOverdue(
        waiting(future, ContractStatus.AWAITING_CUSTOMER_CONFIRMATION),
        now,
      ),
    ).toBe(false);
    expect(isCustomerOverdue(waiting(past, ContractStatus.DISPUTED), now)).toBe(
      false,
    );
  });
});
