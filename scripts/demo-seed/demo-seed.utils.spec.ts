import {
  customerIdentity,
  expectedListingCount,
  fixtureKey,
  mapWithConcurrency,
  normalizeCategoryName,
  providerIdentity,
  withTransientRetry,
} from './demo-seed.utils';

describe('demo seed utilities', () => {
  it('normalizes category names and creates stable identities', () => {
    expect(normalizeCategoryName(' Jewelry & Watches ')).toBe(
      'jewelry-and-watches',
    );
    expect(providerIdentity(3)).toEqual({
      email: 'demo.provider.03@example.invalid',
      phone: '+966551000003',
      name: 'Demo Provider 03',
      commercialName: 'Wesal Demo Services 03',
    });
    expect(customerIdentity().email).toBe('demo.customer@example.invalid');
    expect(fixtureKey(3, 100177, 'Plumbing', 2)).toBe(
      'wesal-demo-v1:p03:c100177:s02',
    );
    expect(expectedListingCount(10, 20, 10)).toBe(2000);
  });

  it('limits concurrent work while retaining input order', async () => {
    let active = 0;
    let peak = 0;
    const result = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (value) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return value * 2;
      },
    );
    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });

  it('retries only errors identified as transient', async () => {
    let calls = 0;
    const value = await withTransientRetry(
      () => {
        calls += 1;
        if (calls < 3) throw new Error('temporary');
        return Promise.resolve('ok');
      },
      () => true,
      3,
      1,
    );
    expect(value).toBe('ok');
    expect(calls).toBe(3);
  });
});
