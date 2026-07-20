import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import type { FixtureManifest } from './demo-seed.types';
import { mapWithConcurrency } from './demo-seed.utils';

const OPENVERSE_API = 'https://api.openverse.org/v1/images/';
const ASSET_ROOT = join(process.cwd(), 'scripts/demo-seed/assets');

const CATEGORY_SPECS = [
  ['real-estate', ['real estate'], 'architecture'],
  ['jewelry-watches', ['Jewelry & Watches'], 'jewelry'],
  ['beauty-cosmetics', ['Beauty & Cosmetics'], 'cosmetics'],
  ['mom-baby', ['Mom & Baby'], 'baby'],
  ['health-fitness', ['Health & Fitness'], 'fitness'],
  ['fashion', ['Fashion'], 'fashion'],
  ['toys', ['Toys'], 'toys'],
  ['housewares', ['Housewares'], 'kitchen'],
  ['cars', ['Cars'], 'car'],
  ['test-cat', ['test cat'], 'tools'],
  ['appliance-repair', ['Appliance Repair'], 'appliance'],
  ['glass-glazing', ['Glass & Glazing'], 'window'],
  ['pest-control', ['Pest Control'], 'pest'],
  ['landscaping', ['Landscaping'], 'garden'],
  ['hvac', ['HVAC'], 'air conditioner'],
  ['painting', ['Painting'], 'painter'],
  ['carpentry', ['Carpentry'], 'woodworking'],
  ['cleaning', ['Cleaning'], 'cleaning'],
  ['electrical', ['Electrical'], 'electrician'],
  ['plumbing', ['Plumbing'], 'plumbing'],
] as const;

interface OpenverseImage {
  id: string;
  title: string | null;
  url: string;
  creator: string | null;
  license: string;
  license_version: string | null;
  license_url: string | null;
  foreign_landing_url: string;
  mature: boolean;
  width: number | null;
  height: number | null;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);
  let crc = 0xffffffff;
  for (const byte of crcInput) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

async function createDemoSignature(destination: string): Promise<void> {
  const width = 640;
  const height = 320;
  const stride = width * 4 + 1;
  const pixels = Buffer.alloc(stride * height, 255);
  for (let y = 0; y < height; y += 1) pixels[y * stride] = 0;
  const plot = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const offset = py * stride + 1 + px * 4;
        pixels[offset] = 18;
        pixels[offset + 1] = 65;
        pixels[offset + 2] = 92;
        pixels[offset + 3] = 255;
      }
    }
  };
  const line = (from: [number, number], to: [number, number]) => {
    const steps = Math.max(
      Math.abs(to[0] - from[0]),
      Math.abs(to[1] - from[1]),
    );
    for (let step = 0; step <= steps; step += 1) {
      const ratio = steps ? step / steps : 0;
      plot(
        Math.round(from[0] + (to[0] - from[0]) * ratio),
        Math.round(from[1] + (to[1] - from[1]) * ratio),
      );
    }
  };
  const points: Array<[number, number]> = [
    [55, 205],
    [105, 105],
    [135, 215],
    [180, 92],
    [215, 205],
    [255, 135],
    [290, 195],
    [330, 145],
    [370, 190],
    [415, 150],
    [455, 185],
    [510, 155],
    [585, 180],
  ];
  for (let index = 1; index < points.length; index += 1) {
    line(points[index - 1], points[index]);
  }
  line([85, 235], [575, 235]);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  await writeFile(
    destination,
    Buffer.concat([
      Buffer.from('89504e470d0a1a0a', 'hex'),
      pngChunk('IHDR', header),
      pngChunk('IDAT', deflateSync(pixels)),
      pngChunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

async function searchOpenverse(
  query: string,
  count: number,
): Promise<OpenverseImage[]> {
  const url = new URL(OPENVERSE_API);
  url.search = new URLSearchParams({
    q: query,
    page_size: '20',
    license_type: 'commercial,modification',
    source: 'flickr',
  }).toString();
  const response = await fetch(url, {
    headers: { 'user-agent': 'WesalDemoSeeder/1.0 (test fixtures)' },
  });
  if (!response.ok)
    throw new Error(`Openverse search failed: HTTP ${response.status}`);
  const body = (await response.json()) as { results: OpenverseImage[] };
  const candidates = body.results.filter(
    (image) =>
      !image.mature &&
      image.url.startsWith('https://') &&
      (image.width ?? 0) >= 640 &&
      (image.height ?? 0) >= 480,
  );
  if (candidates.length < count) {
    throw new Error(
      `Only found ${candidates.length}/${count} usable images for "${query}".`,
    );
  }
  return candidates;
}

async function downloadImage(
  image: OpenverseImage,
  destination: string,
): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(image.url, {
      headers: { 'user-agent': 'WesalDemoSeeder/1.0 (test fixtures)' },
    });
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('jpeg') && !contentType.includes('jpg')) {
        throw new Error(
          `Expected JPEG for ${image.url}; received ${contentType}.`,
        );
      }
      if (bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024) {
        throw new Error(`Image is empty or exceeds 10 MB: ${image.url}`);
      }
      await writeFile(destination, bytes);
      return;
    }
    if (response.status !== 429 && response.status < 500) {
      throw new Error(
        `Download failed for ${image.url}: HTTP ${response.status}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw new Error(`Download retries exhausted for ${image.url}.`);
}

function sourceEntry(file: string, image: OpenverseImage) {
  const version = image.license_version ? ` ${image.license_version}` : '';
  return {
    file,
    title: image.title || `Openverse image ${image.id}`,
    descriptionUrl: image.foreign_landing_url,
    license: `${image.license.toUpperCase()}${version}${image.license_url ? ` (${image.license_url})` : ''}`,
    artist: image.creator ?? undefined,
  };
}

async function addPhotoSet(
  manifest: FixtureManifest,
  query: string,
  count: number,
  relativePathFor: (index: number) => string,
): Promise<string[]> {
  const images = await searchOpenverse(query, count);
  return mapWithConcurrency(images.slice(0, count), 5, async (image, index) => {
    const relativePath = relativePathFor(index);
    await downloadImage(image, join(ASSET_ROOT, relativePath));
    manifest.sources?.push(sourceEntry(relativePath, image));
    return relativePath;
  });
}

async function main(): Promise<void> {
  if (process.argv.includes('--signature-only')) {
    const profileDirectory = join(ASSET_ROOT, 'profiles');
    await mkdir(profileDirectory, { recursive: true });
    await createDemoSignature(join(profileDirectory, 'demo-signature.png'));
    console.log('Wrote demo signature PNG.');
    return;
  }

  await rm(ASSET_ROOT, { recursive: true, force: true });
  await mkdir(ASSET_ROOT, { recursive: true });
  const manifest: FixtureManifest = {
    version: 1,
    license: {
      name: 'Creative Commons images indexed by Openverse',
      note: 'Each unchanged photo records its creator, landing page, and license. Search is restricted to commercial use and modification-compatible licenses.',
    },
    categories: [],
    providerAvatars: [],
    customerAvatar: 'profiles/customer.jpg',
    signature: 'profiles/demo-signature.png',
    sources: [],
  };

  for (const [slug, categoryNames, query] of CATEGORY_SPECS) {
    console.log(`Preparing ${slug}...`);
    const directory = join(ASSET_ROOT, 'categories', slug);
    await mkdir(directory, { recursive: true });
    const files = await addPhotoSet(
      manifest,
      query,
      10,
      (index) => `categories/${slug}/${String(index + 1).padStart(2, '0')}.jpg`,
    );
    manifest.categories.push({
      slug,
      categoryNames: [...categoryNames],
      files,
    });
  }

  console.log('Preparing profile images...');
  await mkdir(join(ASSET_ROOT, 'profiles'), { recursive: true });
  const profiles = await addPhotoSet(
    manifest,
    'professional headshot portrait',
    11,
    (index) =>
      index < 10
        ? `profiles/provider-${String(index + 1).padStart(2, '0')}.jpg`
        : manifest.customerAvatar,
  );
  manifest.providerAvatars = profiles.slice(0, 10);
  await createDemoSignature(join(ASSET_ROOT, manifest.signature));
  manifest.sources?.push({
    file: manifest.signature,
    title: 'Wesal Demo signature',
    descriptionUrl: 'local:test-fixture',
    license: 'Generated for Wesal test fixtures',
  });

  manifest.sources?.sort((left, right) => left.file.localeCompare(right.file));
  await writeFile(
    join(ASSET_ROOT, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  console.log(
    `Wrote ${manifest.sources?.length ?? 0} licensed fixture images.`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
