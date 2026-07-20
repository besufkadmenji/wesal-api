import { parseDemoSeedOptions, TESTING_API_BASE_URL } from './demo-seed.config';

const credentials = {
  DEMO_ADMIN_EMAIL: 'admin@example.com',
  DEMO_ADMIN_PASSWORD: 'admin-password',
  DEMO_ACCOUNT_PASSWORD: 'account-password',
};

describe('parseDemoSeedOptions', () => {
  it('accepts only the explicit testing confirmation', () => {
    const options = parseDemoSeedOptions(
      ['--target', 'testing', '--confirm', 'testing', '--dry-run'],
      credentials,
    );

    expect(options.target).toBe('testing');
    expect(options.dryRun).toBe(true);
    expect(options.apiBaseUrl).toBe(TESTING_API_BASE_URL);
    expect(options.concurrency).toBe(5);
  });

  it('rejects missing confirmation and arbitrary API hosts', () => {
    expect(() =>
      parseDemoSeedOptions(['--target', 'testing'], credentials),
    ).toThrow('Pass both --target testing and --confirm testing');

    expect(() =>
      parseDemoSeedOptions(['--target', 'testing', '--confirm', 'testing'], {
        ...credentials,
        DEMO_API_URL: 'https://example.com',
      }),
    ).toThrow(`must resolve exactly to ${TESTING_API_BASE_URL}`);
  });

  it('caps concurrency and requires all credentials', () => {
    expect(() =>
      parseDemoSeedOptions(
        ['--target', 'testing', '--confirm', 'testing', '--concurrency', '6'],
        credentials,
      ),
    ).toThrow('between 1 and 5');
    expect(() =>
      parseDemoSeedOptions(['--target', 'testing', '--confirm', 'testing'], {}),
    ).toThrow('are required');
  });
});
