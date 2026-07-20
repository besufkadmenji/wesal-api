import { join } from 'node:path';
import type { DemoSeedOptions } from './demo-seed.types';

export const TESTING_API_BASE_URL = 'https://wesal-api.testing3000.cloud';

export function parseDemoSeedOptions(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): DemoSeedOptions {
  const valueFor = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const target = valueFor('--target');
  const confirm = valueFor('--confirm');
  const dryRun = argv.includes('--dry-run');
  const concurrencyValue = valueFor('--concurrency') ?? '5';
  const concurrency = Number(concurrencyValue);

  if (target !== 'testing' || confirm !== 'testing') {
    throw new Error(
      'Refusing to run. Pass both --target testing and --confirm testing.',
    );
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5) {
    throw new Error('--concurrency must be an integer between 1 and 5.');
  }

  const adminEmail = env.DEMO_ADMIN_EMAIL;
  const adminPassword = env.DEMO_ADMIN_PASSWORD;
  const accountPassword = env.DEMO_ACCOUNT_PASSWORD;
  if (!adminEmail || !adminPassword || !accountPassword) {
    throw new Error(
      'DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, and DEMO_ACCOUNT_PASSWORD are required.',
    );
  }
  if (accountPassword.length < 8) {
    throw new Error('DEMO_ACCOUNT_PASSWORD must be at least 8 characters.');
  }

  const apiBaseUrl = env.DEMO_API_URL ?? TESTING_API_BASE_URL;
  const parsedUrl = new URL(apiBaseUrl);
  const expectedUrl = new URL(TESTING_API_BASE_URL);
  if (
    parsedUrl.protocol !== expectedUrl.protocol ||
    parsedUrl.hostname !== expectedUrl.hostname ||
    parsedUrl.port !== expectedUrl.port ||
    parsedUrl.pathname.replace(/\/$/, '') !== ''
  ) {
    throw new Error(
      `DEMO_API_URL must resolve exactly to ${TESTING_API_BASE_URL}.`,
    );
  }

  const root = process.cwd();
  return {
    target: 'testing',
    confirm: 'testing',
    dryRun,
    concurrency,
    apiBaseUrl: TESTING_API_BASE_URL,
    graphqlUrl: `${TESTING_API_BASE_URL}/graphql`,
    websocketUrl: 'wss://wesal-api.testing3000.cloud/graphql',
    adminEmail,
    adminPassword,
    accountPassword,
    otp: env.DEMO_OTP ?? '1234',
    assetRoot: join(root, 'scripts/demo-seed/assets'),
    statePath: join(root, '.demo-seed-state/testing.json'),
  };
}

export function demoSeedUsage(): string {
  return [
    'Usage:',
    '  DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... DEMO_ACCOUNT_PASSWORD=...',
    '  pnpm run seed:demo:api -- --target testing --confirm testing [--dry-run] [--concurrency 1-5]',
  ].join('\n');
}
