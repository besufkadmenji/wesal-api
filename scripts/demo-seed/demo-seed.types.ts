export interface DemoSeedOptions {
  target: 'testing';
  confirm: 'testing';
  dryRun: boolean;
  concurrency: number;
  apiBaseUrl: string;
  graphqlUrl: string;
  websocketUrl: string;
  adminEmail: string;
  adminPassword: string;
  accountPassword: string;
  otp: string;
  assetRoot: string;
  statePath: string;
}

export interface CategoryRecord {
  id: string;
  publicId: number | null;
  nameEn: string;
  nameAr: string;
  status: string;
}

export interface CityRecord {
  id: string;
  countryId: string;
  nameEn: string;
  nameAr: string;
  status: string;
}

export interface AccountRecord {
  id: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: string;
  avatarFilename?: string | null;
  signedContract?: { status: string } | null;
}

export interface AuthenticatedAccount extends AccountRecord {
  accessToken: string;
}

export interface UploadedAsset {
  filename: string;
  url: string;
  size: number;
  originalFilename: string;
}

export interface ListingRecord {
  id: string;
  providerId: string;
  categoryId: string;
  name: string;
  description: string;
  photos: Array<{
    id: string;
    filename: string;
    originalFilename: string;
    size: number;
    sortOrder: number;
    type: string;
  }>;
}

export interface ConversationRecord {
  id: string;
  listingId: string;
  providerId: string;
  userId: string;
  access?: {
    feeRequired: boolean;
    canSend: boolean;
    paidAt?: string | null;
  } | null;
}

export interface FixtureManifestEntry {
  slug: string;
  categoryNames: string[];
  files: string[];
}

export interface FixtureManifest {
  version: number;
  license: {
    name: string;
    note: string;
  };
  categories: FixtureManifestEntry[];
  providerAvatars: string[];
  customerAvatar: string;
  signature: string;
  sources?: Array<{
    file: string;
    title: string;
    descriptionUrl: string;
    license: string;
    artist?: string;
  }>;
}

export interface UploadState {
  version: number;
  target: 'testing';
  uploads: Record<string, UploadedAsset>;
}

export interface SeedSummary {
  providersCreated: number;
  providersReused: number;
  usersCreated: number;
  usersReused: number;
  uploadsCreated: number;
  uploadsReused: number;
  listingsCreated: number;
  listingsReused: number;
  conversationsCreated: number;
  conversationsReused: number;
  messagesCreated: number;
  messagesReused: number;
  failures: string[];
}
