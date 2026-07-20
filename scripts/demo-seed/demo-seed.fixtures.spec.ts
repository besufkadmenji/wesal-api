import { join } from 'node:path';
import {
  findCategoryFixture,
  loadFixtureManifest,
  validateFixtureCoverage,
} from './demo-seed.fixtures';
import type { CategoryRecord } from './demo-seed.types';

const assetRoot = join(process.cwd(), 'scripts/demo-seed/assets');

describe('demo seed fixture pack', () => {
  it('contains ten real files for every mapped category and all profiles', async () => {
    const manifest = await loadFixtureManifest(assetRoot);
    const categories: CategoryRecord[] = manifest.categories.map(
      (entry, index) => ({
        id: String(index),
        publicId: 100000 + index,
        nameEn: entry.categoryNames[0],
        nameAr: entry.categoryNames[0],
        status: 'ACTIVE',
      }),
    );

    await expect(
      validateFixtureCoverage(assetRoot, manifest, categories),
    ).resolves.toEqual([]);
    expect(manifest.categories).toHaveLength(20);
    expect(manifest.sources).toHaveLength(212);
  });

  it('matches normalized live category names', async () => {
    const manifest = await loadFixtureManifest(assetRoot);
    expect(
      findCategoryFixture(manifest, {
        id: 'cars',
        publicId: 1,
        nameEn: 'Cars ',
        nameAr: 'سيارات',
        status: 'ACTIVE',
      })?.slug,
    ).toBe('cars');
  });
});
