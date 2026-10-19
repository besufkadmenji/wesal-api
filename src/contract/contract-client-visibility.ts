import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import type { User } from '../user/entities/user.entity';
import type { Contract } from './entities/contract.entity';

/**
 * BRD (D-19 default): a provider sees the customer's name and contact details
 * only once the contract is paid. Customers and admins always see them.
 */
export const visibleContractClient = (
  contract: Pick<Contract, 'client' | 'paidAt'>,
  viewer: Pick<JwtPayload, 'type'> | undefined,
): User | null => {
  const client = contract.client ?? null;
  if (!client || viewer?.type !== 'provider' || contract.paidAt) {
    return client;
  }
  return {
    ...client,
    name: null,
    phone: '',
    dialCode: undefined,
    email: '',
  };
};
