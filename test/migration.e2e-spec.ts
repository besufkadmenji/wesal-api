import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { SecureCoreTransactionLoop2026071600000 } from '../src/migrations/2026071600000-SecureCoreTransactionLoop';
import { Sprint3ApiReleaseReadiness2026071900000 } from '../src/migrations/2026071900000-Sprint3ApiReleaseReadiness';

jest.setTimeout(120_000);

describe('Sprint 3 legacy migration (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    dataSource = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
      migrations: [
        SecureCoreTransactionLoop2026071600000,
        Sprint3ApiReleaseReadiness2026071900000,
      ],
      synchronize: false,
    });
    await dataSource.initialize();
    const fixture = await readFile(
      join(__dirname, 'fixtures', 'legacy-sprint2.sql'),
      'utf8',
    );
    for (const statement of fixture
      .split(/;\s*(?:\r?\n|$)/)
      .map((value) => value.trim())
      .filter(Boolean)) {
      await dataSource.query(statement);
    }
    await dataSource.runMigrations({ transaction: 'each' });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (container) await container.stop();
  });

  it('backfills provider favorites without losing the record', async () => {
    const rows = await dataSource.query<Array<Record<string, unknown>>>(
      `SELECT "userId", "providerId" FROM favorites`,
    );
    expect(rows).toEqual([
      {
        userId: '10000000-0000-4000-8000-000000000001',
        providerId: '20000000-0000-4000-8000-000000000001',
      },
    ]);
  });

  it('preserves legacy pricing and contextualizes complaints', async () => {
    const [contract] = await dataSource.query<Array<Record<string, unknown>>>(
      `SELECT "pricingVersion", "totalPayable", "providerNetAmount" FROM contracts`,
    );
    expect(contract).toMatchObject({
      pricingVersion: 1,
      totalPayable: '500.00',
    });
    const [complaint] = await dataSource.query<Array<Record<string, unknown>>>(
      `SELECT "reporterType", "conversationId" FROM complaints`,
    );
    expect(complaint).toMatchObject({
      reporterType: 'USER',
      conversationId: '50000000-0000-4000-8000-000000000001',
    });
    const legacy = await dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id FROM complaints_legacy_20260719`,
    );
    expect(legacy).toHaveLength(1);
  });

  it('irreversibly redacts historical contact details', async () => {
    const [message] = await dataSource.query<Array<{ content: string }>>(
      `SELECT content FROM messages`,
    );
    expect(message.content).not.toContain('legacy@example.com');
    expect(message.content).not.toContain('+966 50 000 0001');
    expect(message.content).toContain('[contact hidden]');
  });
});
