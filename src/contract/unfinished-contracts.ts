import { EntityManager, In } from 'typeorm';
import { Contract } from './entities/contract.entity';
import { ContractStatus } from './enums/contract-status.enum';

/**
 * Customer contracts that are still running for a provider: they block the
 * low-rating auto-delete (BRD 4.3.7.2 / Q-B4) and e-contract termination
 * (BRD 4.3.7.3, S4-58).
 */
export const UNFINISHED_CONTRACT_STATUSES: ContractStatus[] = [
  ContractStatus.PENDING,
  ContractStatus.ACCEPTED,
  ContractStatus.IN_PROGRESS,
  ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
  ContractStatus.DELIVERY_IN_PROGRESS,
  ContractStatus.CANCELLATION_REQUESTED,
  ContractStatus.DISPUTED,
];

export const providerHasUnfinishedContracts = async (
  manager: EntityManager,
  providerId: string,
): Promise<boolean> =>
  (await manager.count(Contract, {
    where: { providerId, status: In(UNFINISHED_CONTRACT_STATUSES) },
  })) > 0;
