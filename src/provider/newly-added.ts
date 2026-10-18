import type { Provider } from './entities/provider.entity';
import { ProviderStatus } from './enums/provider-status.enum';

/**
 * S4-54 (PO D-7): an active provider no monthly badge run has evaluated yet
 * shows "Newly Added" until the next run on the 1st.
 */
export const isNewlyAddedProvider = (
  provider: Pick<Provider, 'status' | 'badge' | 'badgeEvaluatedAt'>,
): boolean =>
  provider.status === ProviderStatus.ACTIVE &&
  !provider.badge &&
  !provider.badgeEvaluatedAt;
