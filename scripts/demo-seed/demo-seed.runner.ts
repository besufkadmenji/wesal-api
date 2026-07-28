import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import { DemoApiClient, GraphqlOperationError } from './demo-seed.client';
import {
  findCategoryFixture,
  loadFixtureManifest,
  loadUploadState,
  saveUploadState,
  validateFixtureCoverage,
} from './demo-seed.fixtures';
import { OPERATIONS } from './demo-seed.operations';
import type {
  AccountRecord,
  AuthenticatedAccount,
  CategoryRecord,
  CityRecord,
  ConversationRecord,
  DemoSeedOptions,
  FixtureManifest,
  ListingRecord,
  SeedSummary,
  UploadedAsset,
  UploadState,
} from './demo-seed.types';
import {
  customerIdentity,
  expectedListingCount,
  fixtureKey,
  mapWithConcurrency,
  providerIdentity,
} from './demo-seed.utils';

const PROVIDER_COUNT = 10;
const LISTINGS_PER_CATEGORY = 10;

type Logger = Pick<Console, 'log' | 'warn' | 'error'>;

interface PreflightData {
  getSetting: {
    platformManagerName: string | null;
    platformManagerSignature: string | null;
    contractAcceptanceWindowEnabled: boolean;
    contractAcceptanceWindowDays: number;
  };
  categories: { items: CategoryRecord[]; meta: { total: number } };
  cities: { items: CityRecord[]; meta: { total: number } };
}

function emptySummary(): SeedSummary {
  return {
    providersCreated: 0,
    providersReused: 0,
    usersCreated: 0,
    usersReused: 0,
    uploadsCreated: 0,
    uploadsReused: 0,
    listingsCreated: 0,
    listingsReused: 0,
    conversationsCreated: 0,
    conversationsReused: 0,
    messagesCreated: 0,
    messagesReused: 0,
    failures: [],
  };
}

export class DemoSeedRunner {
  private readonly publicClient: DemoApiClient;
  private adminClient!: DemoApiClient;
  private manifest!: FixtureManifest;
  private uploadState!: UploadState;
  private readonly summary = emptySummary();

  constructor(
    private readonly options: DemoSeedOptions,
    private readonly logger: Logger = console,
    client?: DemoApiClient,
  ) {
    this.publicClient =
      client ?? new DemoApiClient(options.graphqlUrl, options.apiBaseUrl);
  }

  async run(): Promise<SeedSummary> {
    const preflight = await this.preflight();
    const categories = preflight.categories.items;
    const cities = preflight.cities.items;

    this.logger.log(
      `Preflight passed: ${categories.length} active categories, ${cities.length} active cities, ${expectedListingCount(PROVIDER_COUNT, categories.length, LISTINGS_PER_CATEGORY)} expected listings.`,
    );
    if (!preflight.getSetting.contractAcceptanceWindowEnabled) {
      this.logger.log(
        'Conversation acceptance window is disabled; expiresAt is expected to remain null.',
      );
    }

    await this.loginAdmin();
    if (this.options.dryRun) {
      this.logger.log('Dry run complete. No fixture data was created.');
      return this.summary;
    }

    const providers: AuthenticatedAccount[] = [];
    for (let index = 1; index <= PROVIDER_COUNT; index += 1) {
      const city = cities[(index - 1) % cities.length];
      providers.push(await this.ensureProvider(index, city, categories));
    }
    const customer = await this.ensureCustomer(cities[0]);

    await this.ensureProfileMedia(providers, customer);
    const canonicalListings = await this.fetchAllListings(
      providers[0].accessToken,
    );
    await this.recoverCategoryUploads(categories, canonicalListings);
    const categoryUploads = await this.ensureCategoryUploads(
      categories,
      providers[0].accessToken,
    );

    const listingsByProvider = new Map<string, ListingRecord[]>();
    for (let index = 1; index <= providers.length; index += 1) {
      const provider = providers[index - 1];
      const city = cities[(index - 1) % cities.length];
      const listings = await this.ensureListings(
        provider,
        index,
        city,
        categories,
        categoryUploads,
      );
      listingsByProvider.set(provider.id, listings);
    }

    const conversations: Array<{
      conversation: ConversationRecord;
      provider: AuthenticatedAccount;
    }> = [];
    for (const provider of providers) {
      const listings = listingsByProvider.get(provider.id) ?? [];
      const starter = listings.find((listing) =>
        listing.description.includes(':s01]'),
      );
      if (!starter) {
        throw new Error(
          `No starter listing found for provider ${provider.email}.`,
        );
      }
      const conversation = await this.ensureConversation(
        customer,
        provider,
        starter,
      );
      conversations.push({ conversation, provider });
    }

    for (let index = 0; index < conversations.length; index += 1) {
      const entry = conversations[index];
      await this.ensureConversationMessages(
        entry.conversation,
        customer,
        entry.provider,
        index === 0,
      );
    }

    this.logger.log(JSON.stringify(this.summary, null, 2));
    return this.summary;
  }

  private async preflight(): Promise<PreflightData> {
    this.manifest = await loadFixtureManifest(this.options.assetRoot);
    this.uploadState = await loadUploadState(this.options.statePath);
    const data = await this.publicClient.request<PreflightData>(
      'DemoSeedPreflight',
      OPERATIONS.preflight,
    );
    if (!data.categories.items.length)
      throw new Error('No active categories found.');
    if (!data.cities.items.length) throw new Error('No active cities found.');
    if (
      !data.getSetting.platformManagerName ||
      !data.getSetting.platformManagerSignature
    ) {
      throw new Error(
        'Platform manager name and signature must be configured before providers can sign contracts.',
      );
    }
    const fixtureErrors = await validateFixtureCoverage(
      this.options.assetRoot,
      this.manifest,
      data.categories.items,
    );
    if (fixtureErrors.length) {
      throw new Error(
        `Fixture preflight failed:\n- ${fixtureErrors.join('\n- ')}`,
      );
    }
    return data;
  }

  private async loginAdmin(): Promise<void> {
    const data = await this.publicClient.request<{
      adminLogin: { accessToken: string };
    }>('DemoSeedAdminLogin', OPERATIONS.adminLogin, {
      input: {
        email: this.options.adminEmail,
        password: this.options.adminPassword,
      },
    });
    if (!data.adminLogin.accessToken)
      throw new Error('Admin login returned no token.');
    this.adminClient = this.publicClient.withToken(data.adminLogin.accessToken);
  }

  private async findProvider(email: string): Promise<AccountRecord | null> {
    try {
      const data = await this.publicClient.request<{
        providerByEmail: AccountRecord;
      }>('DemoSeedProviderByEmail', OPERATIONS.providerByEmail, { email });
      return data.providerByEmail;
    } catch (error) {
      if (error instanceof GraphqlOperationError) return null;
      throw error;
    }
  }

  private async ensureProvider(
    index: number,
    city: CityRecord,
    categories: CategoryRecord[],
  ): Promise<AuthenticatedAccount> {
    const identity = providerIdentity(index);
    let provider = await this.findProvider(identity.email);
    const providerAlreadyExisted = provider !== null;
    if (!provider) {
      const data = await this.publicClient.request<{
        registerProvider: AccountRecord;
      }>('DemoSeedRegisterProvider', OPERATIONS.registerProvider, {
        input: {
          ...identity,
          password: this.options.accountPassword,
          dialCode: '+966',
          countryId: city.countryId,
          cityId: city.id,
          languageCode: index % 2 === 0 ? 'ar' : 'en',
          address: `${city.nameEn}, Saudi Arabia`,
          latitude: 24.7136 + index / 1000,
          longitude: 46.6753 + index / 1000,
          bankName: 'Wesal Demo Bank',
          ibanNumber: `SA03${String(index).padStart(20, '0')}`,
          commercialRegistrationNumber: `DEMO-CR-${String(index).padStart(4, '0')}`,
          withAbsher: true,
          categoryIds: categories.map((category) => category.id),
        },
      });
      provider = data.registerProvider;
      this.summary.providersCreated += 1;
    } else {
      this.summary.providersReused += 1;
    }

    if (
      providerAlreadyExisted &&
      (!provider.emailVerified || !provider.phoneVerified)
    ) {
      // Login intentionally returns an empty token while issuing fresh OTPs.
      await this.publicClient.request(
        'DemoSeedLoginProvider',
        OPERATIONS.loginProvider,
        {
          input: {
            emailOrPhone: identity.email,
            password: this.options.accountPassword,
          },
        },
      );
    }
    if (!provider.emailVerified) {
      await this.verifyOtp(true, provider.email, 'EMAIL_VERIFICATION');
    }
    if (!provider.phoneVerified) {
      await this.verifyOtp(true, provider.phone, 'PHONE_VERIFICATION');
    }
    if (provider.status !== 'ACTIVE') {
      await this.adminClient.request(
        'DemoSeedActivateProvider',
        OPERATIONS.activateProvider,
        {
          id: provider.id,
        },
      );
    }

    const authenticated = await this.loginProvider(identity.email);
    const refreshed = await this.findProvider(identity.email);
    if (
      !refreshed?.signedContract ||
      refreshed.signedContract.status !== 'ACTIVE'
    ) {
      const signature = await this.ensureUpload(
        this.manifest.signature,
        authenticated.accessToken,
      );
      await this.publicClient
        .withToken(authenticated.accessToken)
        .request('DemoSeedSignContract', OPERATIONS.signContract, {
          input: {
            serviceProviderSignature: signature.filename,
            acceptedRulesEn: [],
            acceptedRulesAr: [],
          },
        });
    }
    return { ...authenticated, signedContract: { status: 'ACTIVE' } };
  }

  private async verifyOtp(
    provider: boolean,
    target: string,
    type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION',
  ): Promise<void> {
    await this.publicClient.request(
      provider ? 'DemoSeedVerifyProviderOtp' : 'DemoSeedVerifyUserOtp',
      provider ? OPERATIONS.verifyProviderOtp : OPERATIONS.verifyUserOtp,
      { input: { target, code: this.options.otp, type } },
    );
  }

  private async loginProvider(email: string): Promise<AuthenticatedAccount> {
    const data = await this.publicClient.request<{
      loginProvider: { accessToken: string; provider: AccountRecord };
    }>('DemoSeedLoginProvider', OPERATIONS.loginProvider, {
      input: { emailOrPhone: email, password: this.options.accountPassword },
    });
    if (!data.loginProvider.accessToken) {
      throw new Error(`Provider ${email} could not obtain an access token.`);
    }
    return {
      ...data.loginProvider.provider,
      accessToken: data.loginProvider.accessToken,
    };
  }

  private async findCustomer(email: string): Promise<AccountRecord | null> {
    const data = await this.adminClient.request<{
      users: { items: AccountRecord[] };
    }>('DemoSeedUsers', OPERATIONS.users, {
      pagination: { page: 1, limit: 10, search: email },
    });
    return data.users.items.find((user) => user.email === email) ?? null;
  }

  private async ensureCustomer(
    city: CityRecord,
  ): Promise<AuthenticatedAccount> {
    const identity = customerIdentity();
    let customer = await this.findCustomer(identity.email);
    if (!customer) {
      const data = await this.publicClient.request<{
        register: AccountRecord;
      }>('DemoSeedRegisterUser', OPERATIONS.registerUser, {
        input: {
          ...identity,
          password: this.options.accountPassword,
          dialCode: '+966',
          bankName: 'Wesal Demo Bank',
          ibanNumber: 'SA0300000000000000000099',
          withAbsher: true,
        },
      });
      customer = data.register;
      this.summary.usersCreated += 1;
    } else {
      this.summary.usersReused += 1;
    }
    if (!customer.emailVerified) {
      await this.verifyOtp(false, customer.email, 'EMAIL_VERIFICATION');
    }
    if (!customer.phoneVerified) {
      await this.verifyOtp(false, customer.phone, 'PHONE_VERIFICATION');
    }
    const data = await this.publicClient.request<{
      login: { accessToken: string; user: AccountRecord };
    }>('DemoSeedLoginUser', OPERATIONS.loginUser, {
      input: {
        emailOrPhone: identity.email,
        password: this.options.accountPassword,
      },
    });
    if (!data.login.accessToken)
      throw new Error('Customer login returned no token.');
    await this.publicClient
      .withToken(data.login.accessToken)
      .request('DemoSeedUpdateUser', OPERATIONS.updateUser, {
        input: {
          cityId: city.id,
          countryId: city.countryId,
          address: `${city.nameEn}, Saudi Arabia`,
          latitude: 24.7136,
          longitude: 46.6753,
        },
      });
    return { ...data.login.user, accessToken: data.login.accessToken };
  }

  private async ensureProfileMedia(
    providers: AuthenticatedAccount[],
    customer: AuthenticatedAccount,
  ): Promise<void> {
    for (let index = 0; index < providers.length; index += 1) {
      if (providers[index].avatarFilename) continue;
      const avatar = await this.ensureUpload(
        this.manifest.providerAvatars[index],
        providers[index].accessToken,
      );
      await this.publicClient
        .withToken(providers[index].accessToken)
        .request('DemoSeedUpdateProvider', OPERATIONS.updateProvider, {
          input: { id: providers[index].id, avatarFilename: avatar.filename },
        });
      providers[index].avatarFilename = avatar.filename;
    }
    if (!customer.avatarFilename) {
      const avatar = await this.ensureUpload(
        this.manifest.customerAvatar,
        customer.accessToken,
      );
      await this.publicClient
        .withToken(customer.accessToken)
        .request('DemoSeedUpdateUser', OPERATIONS.updateUser, {
          input: { avatarFilename: avatar.filename },
        });
      customer.avatarFilename = avatar.filename;
    }
  }

  private async ensureUpload(
    relativePath: string,
    token: string,
  ): Promise<UploadedAsset> {
    const cached = this.uploadState.uploads[relativePath];
    const client = this.publicClient.withToken(token);
    if (cached && (await client.isUploadedAssetReachable(cached))) {
      this.summary.uploadsReused += 1;
      return cached;
    }
    const uploaded = await client.upload(
      join(this.options.assetRoot, relativePath),
    );
    this.uploadState.uploads[relativePath] = uploaded;
    await saveUploadState(this.options.statePath, this.uploadState);
    this.summary.uploadsCreated += 1;
    return uploaded;
  }

  private async ensureCategoryUploads(
    categories: CategoryRecord[],
    token: string,
  ): Promise<Map<string, UploadedAsset[]>> {
    const pairs = categories.flatMap((category) => {
      const fixture = findCategoryFixture(this.manifest, category);
      if (!fixture)
        throw new Error(`Missing fixture mapping for ${category.nameEn}.`);
      return fixture.files.map((file) => ({ category, file }));
    });
    const uploaded = await mapWithConcurrency(
      pairs,
      this.options.concurrency,
      async ({ category, file }) => ({
        categoryId: category.id,
        asset: await this.ensureUpload(file, token),
      }),
    );
    const result = new Map<string, UploadedAsset[]>();
    for (const item of uploaded) {
      const assets = result.get(item.categoryId) ?? [];
      assets.push(item.asset);
      result.set(item.categoryId, assets);
    }
    return result;
  }

  private async recoverCategoryUploads(
    categories: CategoryRecord[],
    canonicalListings: ListingRecord[],
  ): Promise<void> {
    let recovered = false;
    for (const category of categories) {
      const fixture = findCategoryFixture(this.manifest, category);
      if (!fixture) continue;
      for (let slot = 1; slot <= LISTINGS_PER_CATEGORY; slot += 1) {
        const relativePath = fixture.files[slot - 1];
        if (this.uploadState.uploads[relativePath]) continue;
        const marker = `[${fixtureKey(1, category.publicId, category.nameEn, slot)}]`;
        const photo = canonicalListings.find((listing) =>
          listing.description.includes(marker),
        )?.photos[0];
        if (!photo) continue;
        this.uploadState.uploads[relativePath] = {
          filename: photo.filename,
          url: `/files/${encodeURIComponent(photo.filename)}`,
          size: photo.size,
          originalFilename: photo.originalFilename,
        };
        recovered = true;
      }
    }
    if (recovered) {
      await saveUploadState(this.options.statePath, this.uploadState);
      this.logger.log(
        'Recovered uploaded media from canonical fixture listings.',
      );
    }
  }

  private async fetchAllListings(token: string): Promise<ListingRecord[]> {
    const client = this.publicClient.withToken(token);
    const items: ListingRecord[] = [];
    let page = 1;
    while (true) {
      const data = await client.request<{
        myListings: {
          items: ListingRecord[];
          meta: { hasNext: boolean };
        };
      }>('DemoSeedMyListings', OPERATIONS.myListings, {
        input: { page, limit: 100, sortOrder: 'ASC' },
      });
      items.push(...data.myListings.items);
      if (!data.myListings.meta.hasNext) break;
      page += 1;
    }
    return items;
  }

  private async ensureListings(
    provider: AuthenticatedAccount,
    providerIndex: number,
    city: CityRecord,
    categories: CategoryRecord[],
    uploads: Map<string, UploadedAsset[]>,
  ): Promise<ListingRecord[]> {
    const existing = await this.fetchAllListings(provider.accessToken);
    const createdOrExisting: ListingRecord[] = [];
    const tasks = categories.flatMap((category) =>
      Array.from({ length: LISTINGS_PER_CATEGORY }, (_, index) => ({
        category,
        slot: index + 1,
      })),
    );
    const results = await mapWithConcurrency(
      tasks,
      this.options.concurrency,
      async ({ category, slot }) => {
        const key = fixtureKey(
          providerIndex,
          category.publicId,
          category.nameEn,
          slot,
        );
        const marker = `[${key}]`;
        const found = existing.find((listing) =>
          listing.description.includes(marker),
        );
        if (found) {
          this.summary.listingsReused += 1;
          return found;
        }
        const asset = uploads.get(category.id)?.[slot - 1];
        if (!asset)
          throw new Error(
            `Missing uploaded image ${slot} for ${category.nameEn}.`,
          );
        const input = {
          categoryId: category.id,
          cityId: city.id,
          name: `${category.nameAr} ${slot} | ${category.nameEn} ${slot}`,
          description: `خدمة ${category.nameAr} احترافية في ${city.nameAr}. Professional ${category.nameEn} service in ${city.nameEn}, delivered by verified Wesal demo provider ${providerIndex}. ${marker}`,
          price: 75 + providerIndex * 20 + slot * 15,
          type: 'FREE',
          photos: [
            {
              id: randomUUID(),
              filename: asset.filename,
              type: 'IMAGE',
              sortOrder: 0,
              originalFilename: asset.originalFilename,
              size: asset.size,
            },
          ],
        };
        const data = await this.publicClient
          .withToken(provider.accessToken)
          .request<{
            createListing: ListingRecord;
          }>('DemoSeedCreateListing', OPERATIONS.createListing, { input });
        this.summary.listingsCreated += 1;
        return data.createListing;
      },
    );
    createdOrExisting.push(...results);
    return createdOrExisting;
  }

  private async ensureConversation(
    customer: AuthenticatedAccount,
    provider: AuthenticatedAccount,
    listing: ListingRecord,
  ): Promise<ConversationRecord> {
    const customerClient = this.publicClient.withToken(customer.accessToken);
    const existing = await customerClient.request<{
      conversations: { items: ConversationRecord[] };
    }>('DemoSeedConversations', OPERATIONS.conversations, {
      input: { page: 1, limit: 10, listingId: listing.id },
    });
    let conversation = existing.conversations.items[0];
    if (conversation) {
      this.summary.conversationsReused += 1;
    } else {
      const data = await customerClient.request<{
        createConversation: ConversationRecord;
      }>('DemoSeedCreateConversation', OPERATIONS.createConversation, {
        input: { listingId: listing.id },
      });
      conversation = data.createConversation;
      this.summary.conversationsCreated += 1;
    }
    await this.ensureConversationAccess(customerClient, conversation.id);
    const providerClient = this.publicClient.withToken(provider.accessToken);
    await this.ensureConversationAccess(providerClient, conversation.id);
    return conversation;
  }

  private async ensureConversationAccess(
    client: DemoApiClient,
    conversationId: string,
  ): Promise<void> {
    const data = await client.request<{ conversation: ConversationRecord }>(
      'DemoSeedConversation',
      OPERATIONS.conversation,
      { id: conversationId },
    );
    if (
      data.conversation.access?.feeRequired &&
      !data.conversation.access.canSend
    ) {
      await client.request(
        'DemoSeedPayConversationFee',
        OPERATIONS.payConversationFee,
        { conversationId },
      );
    }
  }

  private async ensureConversationMessages(
    conversation: ConversationRecord,
    customer: AuthenticatedAccount,
    provider: AuthenticatedAccount,
    verifySubscription: boolean,
  ): Promise<void> {
    const customerClient = this.publicClient.withToken(customer.accessToken);
    const providerClient = this.publicClient.withToken(provider.accessToken);
    const data = await customerClient.request<{
      messages: { items: Array<{ content: string }> };
    }>('DemoSeedMessages', OPERATIONS.messages, {
      input: {
        page: 1,
        limit: 100,
        conversationId: conversation.id,
        sortOrder: 'ASC',
      },
    });
    const messages = [
      {
        marker: '[wesal-demo-msg-1]',
        client: customerClient,
        content: 'مرحباً، أود معرفة المزيد عن هذه الخدمة. [wesal-demo-msg-1]',
      },
      {
        marker: '[wesal-demo-msg-2]',
        client: providerClient,
        content: 'أهلاً بك، يسعدني توضيح جميع التفاصيل. [wesal-demo-msg-2]',
      },
      {
        marker: '[wesal-demo-msg-3]',
        client: customerClient,
        content:
          'What is the earliest available appointment? [wesal-demo-msg-3]',
      },
    ];
    for (const message of messages) {
      if (
        data.messages.items.some((item) =>
          item.content.includes(message.marker),
        )
      ) {
        this.summary.messagesReused += 1;
        continue;
      }
      await this.createMessage(
        message.client,
        conversation.id,
        message.content,
      );
    }

    const finalMarker = '[wesal-demo-msg-4]';
    if (
      data.messages.items.some((item) => item.content.includes(finalMarker))
    ) {
      this.summary.messagesReused += 1;
      return;
    }
    const finalContent = `We can start tomorrow morning. ${finalMarker}`;
    if (verifySubscription) {
      await this.assertSubscriptionReceivesMessage(
        customer.accessToken,
        conversation.id,
        () => this.createMessage(providerClient, conversation.id, finalContent),
        finalMarker,
      );
    } else {
      await this.createMessage(providerClient, conversation.id, finalContent);
    }
  }

  private async createMessage(
    client: DemoApiClient,
    conversationId: string,
    content: string,
  ): Promise<void> {
    await client.request('DemoSeedCreateMessage', OPERATIONS.createMessage, {
      input: { conversationId, content },
    });
    this.summary.messagesCreated += 1;
  }

  private async assertSubscriptionReceivesMessage(
    token: string,
    conversationId: string,
    sendMessage: () => Promise<void>,
    expectedMarker: string,
  ): Promise<void> {
    let resolveConnected: (() => void) | undefined;
    const connected = new Promise<void>((resolve) => {
      resolveConnected = resolve;
    });
    const client = createClient({
      url: this.options.websocketUrl,
      webSocketImpl: WebSocket,
      connectionParams: { Authorization: `Bearer ${token}` },
      retryAttempts: 0,
      on: { connected: () => resolveConnected?.() },
    });
    let dispose: (() => void) | undefined;
    try {
      const received = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(
              new Error('Timed out waiting for messageAdded subscription.'),
            ),
          10_000,
        );
        dispose = client.subscribe(
          {
            query: OPERATIONS.messageAdded,
            variables: { conversationId },
          },
          {
            next: (result) => {
              const content = (
                result.data as
                  | { messageAdded?: { content?: string } }
                  | undefined
              )?.messageAdded?.content;
              if (content?.includes(expectedMarker)) {
                clearTimeout(timeout);
                resolve();
              }
            },
            error: (error) => {
              clearTimeout(timeout);
              reject(
                new Error(`Subscription failed: ${JSON.stringify(error)}`),
              );
            },
            complete: () => undefined,
          },
        );
      });
      let connectionTimer: ReturnType<typeof setTimeout> | undefined;
      const connectionTimeout = new Promise<never>((_, reject) => {
        connectionTimer = setTimeout(
          () => reject(new Error('Timed out connecting to GraphQL WebSocket.')),
          10_000,
        );
      });
      await Promise.race([connected, connectionTimeout]);
      if (connectionTimer) clearTimeout(connectionTimer);
      await sendMessage();
      await received;
      this.logger.log(
        'Direct GraphQL WebSocket subscription smoke test passed.',
      );
    } finally {
      dispose?.();
      await client.dispose();
    }
  }
}

export async function runDemoSeed(
  options: DemoSeedOptions,
  logger: Logger = console,
): Promise<SeedSummary> {
  return new DemoSeedRunner(options, logger).run();
}
