import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  CategoryRecord,
  FixtureManifest,
  FixtureManifestEntry,
  UploadState,
} from './demo-seed.types';
import { normalizeCategoryName } from './demo-seed.utils';

export async function loadFixtureManifest(
  assetRoot: string,
): Promise<FixtureManifest> {
  const source = await readFile(join(assetRoot, 'manifest.json'), 'utf8');
  return JSON.parse(source) as FixtureManifest;
}

export function findCategoryFixture(
  manifest: FixtureManifest,
  category: CategoryRecord,
): FixtureManifestEntry | undefined {
  const normalizedName = normalizeCategoryName(category.nameEn);
  return manifest.categories.find((entry) =>
    entry.categoryNames.some(
      (name) => normalizeCategoryName(name) === normalizedName,
    ),
  );
}

export async function validateFixtureCoverage(
  assetRoot: string,
  manifest: FixtureManifest,
  categories: CategoryRecord[],
): Promise<string[]> {
  const errors: string[] = [];
  const referencedFiles = new Set<string>();
  for (const category of categories) {
    const fixture = findCategoryFixture(manifest, category);
    if (!fixture) {
      errors.push(`No fixture mapping for category "${category.nameEn}".`);
      continue;
    }
    if (fixture.files.length !== 10) {
      errors.push(
        `Category "${category.nameEn}" must map to exactly 10 images; found ${fixture.files.length}.`,
      );
    }
    for (const file of fixture.files) {
      referencedFiles.add(file);
      try {
        const contents = await readFile(join(assetRoot, file));
        validateImageFile(file, contents, errors);
      } catch {
        errors.push(`Fixture file is missing: ${file}`);
      }
    }
  }
  for (const file of [
    ...manifest.providerAvatars,
    manifest.customerAvatar,
    manifest.signature,
  ]) {
    referencedFiles.add(file);
    try {
      const contents = await readFile(join(assetRoot, file));
      validateImageFile(file, contents, errors);
    } catch {
      errors.push(`Fixture file is missing: ${file}`);
    }
  }
  if (manifest.providerAvatars.length !== 10) {
    errors.push(
      'The fixture manifest must contain exactly 10 provider avatars.',
    );
  }
  for (const file of referencedFiles) {
    const source = manifest.sources?.find((entry) => entry.file === file);
    if (!source?.license || !source.descriptionUrl) {
      errors.push(`Fixture source/license metadata is missing: ${file}`);
    }
  }
  return errors;
}

function validateImageFile(
  file: string,
  contents: Buffer,
  errors: string[],
): void {
  if (contents.length === 0 || contents.length > 10 * 1024 * 1024) {
    errors.push(`Fixture file must be between 1 byte and 10 MB: ${file}`);
  }
  const isJpeg =
    contents[0] === 0xff && contents[1] === 0xd8 && contents[2] === 0xff;
  const isPng =
    contents[0] === 0x89 &&
    contents[1] === 0x50 &&
    contents[2] === 0x4e &&
    contents[3] === 0x47;
  if (!isJpeg && !isPng) {
    errors.push(`Fixture file is not a JPEG or PNG image: ${file}`);
  }
}

export async function loadUploadState(statePath: string): Promise<UploadState> {
  try {
    const source = await readFile(statePath, 'utf8');
    const state = JSON.parse(source) as UploadState;
    if (state.version === 1 && state.target === 'testing') return state;
  } catch {
    // A missing or invalid cache is safe: the runner will rebuild it.
  }
  return { version: 1, target: 'testing', uploads: {} };
}

export async function saveUploadState(
  statePath: string,
  state: UploadState,
): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
