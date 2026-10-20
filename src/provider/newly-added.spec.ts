import { BadgeTier } from '../badge/enums/badge-tier.enum';
import { ProviderStatus } from './enums/provider-status.enum';
import { isNewlyAddedProvider } from './newly-added';

describe('isNewlyAddedProvider', () => {
  const base = {
    status: ProviderStatus.ACTIVE,
    badge: null,
    badgeEvaluatedAt: null,
  };

  it('is true for an active provider no badge run has evaluated', () => {
    expect(isNewlyAddedProvider(base)).toBe(true);
  });

  it('is false once a run evaluated them, with or without a badge', () => {
    expect(
      isNewlyAddedProvider({ ...base, badgeEvaluatedAt: new Date() }),
    ).toBe(false);
    expect(isNewlyAddedProvider({ ...base, badge: BadgeTier.TRUST })).toBe(
      false,
    );
  });

  it('is false for providers that are not active', () => {
    expect(
      isNewlyAddedProvider({
        ...base,
        status: ProviderStatus.PENDING_APPROVAL,
      }),
    ).toBe(false);
  });
});
