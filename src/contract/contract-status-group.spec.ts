import {
  CONTRACT_STATUS_GROUPS,
  ContractStatusGroup,
  statusesInGroup,
} from './contract-status-group';
import { ContractStatus } from './enums/contract-status.enum';

describe('contract status groups (S4-1)', () => {
  it('places every status except DRAFT under one tab', () => {
    for (const status of Object.values(ContractStatus)) {
      expect(status in CONTRACT_STATUS_GROUPS).toBe(true);
    }
    expect(CONTRACT_STATUS_GROUPS[ContractStatus.DRAFT]).toBeNull();
  });

  it('groups the states Figma does not show under the nearest tab', () => {
    expect(statusesInGroup(ContractStatusGroup.IN_PROGRESS).sort()).toEqual(
      [
        ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
        ContractStatus.CANCELLATION_REQUESTED,
        ContractStatus.DISPUTED,
        ContractStatus.IN_PROGRESS,
      ].sort(),
    );
    expect(statusesInGroup(ContractStatusGroup.PENDING_ACCEPTANCE)).toEqual(
      expect.arrayContaining([ContractStatus.PENDING, ContractStatus.REJECTED]),
    );
    expect(statusesInGroup(ContractStatusGroup.IN_DELIVERY)).toEqual([
      ContractStatus.DELIVERY_IN_PROGRESS,
    ]);
  });
});
