import { setTimeout as delay } from 'node:timers/promises';

export function normalizeCategoryName(value: string): string {
  return value
    .normalize('NFKD')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function providerIdentity(index: number) {
  const number = String(index).padStart(2, '0');
  return {
    email: `demo.provider.${number}@example.invalid`,
    phone: `+96655${String(1000000 + index).slice(-7)}`,
    name: `Demo Provider ${number}`,
    commercialName: `Wesal Demo Services ${number}`,
  };
}

export function customerIdentity() {
  return {
    email: 'demo.customer@example.invalid',
    phone: '+966569999999',
    name: 'Wesal Demo Customer',
  };
}

export function fixtureKey(
  providerIndex: number,
  categoryPublicId: number | null,
  categoryName: string,
  slot: number,
): string {
  const categoryKey = categoryPublicId ?? normalizeCategoryName(categoryName);
  return `wesal-demo-v1:p${String(providerIndex).padStart(2, '0')}:c${categoryKey}:s${String(slot).padStart(2, '0')}`;
}

export function expectedListingCount(
  providerCount: number,
  categoryCount: number,
  listingsPerCategory: number,
): number {
  return providerCount * categoryCount * listingsPerCategory;
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (cursor < values.length) {
        const index = cursor++;
        results[index] = await mapper(values[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  isTransient: (error: unknown) => boolean,
  attempts = 4,
  baseDelayMs = 250,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransient(error)) throw error;
      await delay(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
