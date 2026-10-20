import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import * as jwt from 'jsonwebtoken';
import { createClient, Client as GraphqlWsClient } from 'graphql-ws';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import WebSocket from 'ws';
import { FileUploadService } from '../lib/file-upload';
import { AppModule } from '../src/app.module';
import { Category } from '../src/category/entities/category.entity';
import { CategoryService } from '../src/category/category.service';
import { City } from '../src/city/entities/city.entity';
import { BadgeService } from '../src/badge/badge.service';
import { ContractService } from '../src/contract/contract.service';
import { Contract } from '../src/contract/entities/contract.entity';
import { Conversation } from '../src/conversation/entities/conversation.entity';
import { Notification } from '../src/notification/entities/notification.entity';
import { ContractStatus } from '../src/contract/enums/contract-status.enum';
import { ContractResolution } from '../src/contract/dto/admin-resolve-contract.input';
import { claimContractNumber } from '../src/contract/contract-number-pool';
import { ConversationService } from '../src/conversation/conversation.service';
import { Message } from '../src/conversation/entities/message.entity';
import { MessageKind } from '../src/conversation/enums/message-kind.enum';
import { MessageService } from '../src/conversation/message.service';
import { Country } from '../src/country/entities/country.entity';
import { Listing } from '../src/listing/entities/listing.entity';
import {
  ListingStatus,
  ListingType,
  PromotionStatus,
} from '../src/listing/enums/listing.enum';
import { MediaType } from '../src/listing/enums/media.enum';
import { ListingService } from '../src/listing/listing.service';
import { Payment } from '../src/payment/entities/payment.entity';
import { PaymentPurpose } from '../src/payment/enums/payment-purpose.enum';
import { PaymentService } from '../src/payment/payment.service';
import { PaymentCheckoutService } from '../src/payment/payment-checkout.service';
import { CheckoutPurpose } from '../src/payment/enums/checkout-purpose.enum';
import { PaymentMethod } from '../src/payment/enums/payment-method.enum';
import { PaymentStatus } from '../src/payment/enums/payment-status.enum';
import {
  MockPaymentGateway,
  MOCK_SIGNATURE_HEADER,
} from '../src/payment/gateway/mock.gateway';
import { Provider } from '../src/provider/entities/provider.entity';
import { ProviderStatus } from '../src/provider/enums/provider-status.enum';
import { SignedContractStatus } from '../src/provider/enums/contract.enum';
import { SettingService } from '../src/setting/setting.service';
import { SignedContract } from '../src/signed-contract/signed-contract.entity';
import { User } from '../src/user/entities/user.entity';
import { UserStatus } from '../src/user/enums/user-status.enum';
import type { JwtPayload } from '../src/auth/strategies/jwt.strategy';
import { RatingService } from '../src/rating/rating.service';
import { RatingStatus } from '../src/rating/enums/rating-status.enum';
import { AdminPermissionType } from '../src/admin/enums/admin-permission-type.enum';
import { Admin } from '../src/admin/entities/admin.entity';
import { AdminStatus } from '../src/admin/enums/admin-status.enum';
import { AdminPermission } from '../src/admin-permission/entities/admin-permission.entity';
import { Permission } from '../src/permission/entities/permission.entity';
import { PermissionPlatform } from '../src/permission/enums/permission-platform.enum';

jest.setTimeout(120_000);

describe('Sprint 3 API boundaries (e2e)', () => {
  let app: INestApplication<App>;
  let appUrl: string;
  let container: StartedPostgreSqlContainer;
  let transactionConversationId: string;
  let transactionCustomer: JwtPayload;
  let transactionProvider: JwtPayload;
  let transactionContractId: string;
  let transactionListingId: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.AUTO_SEED = 'false';
    process.env.ELASTIC_ENABLED = 'false';
    process.env.JWT_SECRET = 'sprint-3-e2e-secret';
    process.env.PAYMENT_GATEWAY = 'mock';
    process.env.WEB_APP_URL = 'https://web.e2e.test';

    const client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();
    await client.query(
      'CREATE SEQUENCE IF NOT EXISTS public_id_seq START 1000',
    );
    await client.end();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FileUploadService)
      .useValue({
        saveFile: jest.fn(),
        getFile: jest.fn(),
        getFileWithMetadata: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.listen(0, '127.0.0.1');
    appUrl = await app.getUrl();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (container) await container.stop();
  });

  it('keeps the health endpoint available', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('rejects an unauthenticated upload before accepting a file', async () => {
    await request(app.getHttpServer())
      .post('/upload')
      .attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'evidence.png',
        contentType: 'image/png',
      })
      .expect(401);
  });

  it.each([
    '/reports/conversation-fees/export?format=pdf',
    '/reports/premium-ads/export?format=xlsx',
    '/users/export',
  ])('rejects unauthenticated export %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });

  it('completes the customer fee, chat, versioned contract, acceptance, and idempotent payment flow', async () => {
    const dataSource = app.get(DataSource);
    const country = await dataSource.getRepository(Country).save({
      nameEn: 'Saudi Arabia',
      nameAr: 'السعودية',
      code: 'SA-E2E',
      dialCode: '+966',
    });
    const city = await dataSource.getRepository(City).save({
      countryId: country.id,
      nameEn: 'Riyadh',
      nameAr: 'الرياض',
    });
    const category = await dataSource.getRepository(Category).save({
      image: 'category.png',
      nameEn: 'Maintenance',
      nameAr: 'صيانة',
      descriptionEn: 'Maintenance services',
      descriptionAr: 'خدمات الصيانة',
      rulesEn: 'E2E rules',
      rulesAr: 'شروط الاختبار',
      commissionEnabled: true,
      commissionPercent: 2,
      minCommissionEnabled: true,
      minCommissionAmount: 5,
      depositEnabled: true,
      depositPercent: 10,
      maxExecutionHoursEnabled: true,
      maxExecutionHours: 30,
      maxTerminationHoursEnabled: true,
      maxTerminationHours: 5,
      customerConversationFeeEnabled: true,
      customerConversationFee: 10,
      providerConversationFeeEnabled: true,
      providerConversationFee: 20,
      contractDocumentEnabled: true,
      contractDocumentText: 'Binding E2E terms',
    });
    const customer = await dataSource.getRepository(User).save({
      name: 'Sprint Customer',
      phone: '+966500000101',
      email: 'customer-e2e@example.com',
      password: '',
      status: UserStatus.ACTIVE,
      cityId: city.id,
      countryId: country.id,
      address: 'Customer address',
    });
    const provider = await dataSource.getRepository(Provider).save({
      name: 'Sprint Provider',
      commercialName: 'Sprint Services',
      phone: '+966500000202',
      email: 'provider-e2e@example.com',
      password: '',
      status: ProviderStatus.ACTIVE,
      cityId: city.id,
      countryId: country.id,
      address: 'Provider address',
    });
    const listing = await dataSource.getRepository(Listing).save({
      providerId: provider.id,
      categoryId: category.id,
      cityId: city.id,
      name: 'Sprint listing',
      description: 'A listing used by the Sprint 3 integration flow.',
      price: 500,
      status: ListingStatus.ACTIVE,
      type: ListingType.FREE,
      promotionStatus: PromotionStatus.NONE,
      promotionCycle: 0,
      story: {
        id: 'story-e2e',
        filename: 'story.mp4',
        originalFilename: 'story.mp4',
        size: 1,
        type: MediaType.VIDEO,
        sortOrder: 0,
      },
      photos: [],
      tags: '',
    });
    await app.get(SettingService).setSetting({
      vatEnabled: true,
      vatRate: 15,
      contractAcceptanceWindowEnabled: true,
      contractAcceptanceWindowDays: 30,
    });

    const customerPrincipal = {
      sub: customer.id,
      email: customer.email,
      type: 'user' as const,
    };
    const providerPrincipal = {
      sub: provider.id,
      email: provider.email,
      type: 'provider' as const,
    };
    transactionCustomer = customerPrincipal;
    transactionProvider = providerPrincipal;
    transactionListingId = listing.id;
    const conversation = await app
      .get(ConversationService)
      .create({ listingId: listing.id }, customerPrincipal);
    transactionConversationId = conversation.id;
    await app
      .get(PaymentService)
      .settleConversationFee(conversation.id, customerPrincipal);
    await app
      .get(PaymentService)
      .settleConversationFee(conversation.id, providerPrincipal);

    const chatMessage = await app.get(MessageService).create(
      {
        conversationId: conversation.id,
        content: 'Contact me at hidden@example.com or +966 50 123 4567',
      },
      customerPrincipal,
    );
    expect(chatMessage.content).toBe(
      'Contact me at [contact hidden] or [contact hidden]',
    );

    const firstContract = await app.get(ContractService).create(
      {
        conversationId: conversation.id,
        agreedPrice: 500,
        customerAddress: 'Customer address',
        signatureData: 'customer-signature-v1',
      },
      customerPrincipal,
    );
    expect(firstContract.pricingVersion).toBe(2);
    expect(Number(firstContract.totalPayable)).toBe(575);
    expect(Number(firstContract.providerNetAmount)).toBe(490);
    await app
      .get(ContractService)
      .rejectContract(
        { contractId: firstContract.id, reason: 'Please revise the scope' },
        providerPrincipal,
      );
    const secondContract = await app.get(ContractService).resendContract(
      {
        rejectedContractId: firstContract.id,
        agreedPrice: 600,
        customerAddress: 'Customer address',
        signatureData: 'customer-signature-v2',
      },
      customerPrincipal,
    );
    expect(secondContract).toMatchObject({
      version: 2,
      supersedesContractId: firstContract.id,
    });
    expect(Number(secondContract.totalPayable)).toBe(690);
    expect(Number(secondContract.providerNetAmount)).toBe(588);
    await app.get(ContractService).acceptContract(
      {
        contractId: secondContract.id,
        signatureData: 'provider-signature-v2',
        executionHours: 7,
      },
      providerPrincipal,
    );
    const firstPayment = await app
      .get(PaymentService)
      .settleContractPayment(secondContract.id, customerPrincipal);
    const retry = await app
      .get(PaymentService)
      .settleContractPayment(secondContract.id, customerPrincipal);

    expect(Number(firstPayment.payment.amount)).toBe(690);
    expect(retry.payment.id).toBe(firstPayment.payment.id);
    expect(retry.contract.status).toBe(ContractStatus.IN_PROGRESS);
    transactionContractId = secondContract.id;
    const events = await dataSource.getRepository(Message).find({
      where: { conversationId: conversation.id },
    });
    expect(events.map((event) => event.kind)).toEqual(
      expect.arrayContaining([
        MessageKind.CHAT_FEE_PAID,
        MessageKind.CONTRACT_CREATED,
        MessageKind.CONTRACT_REJECTED,
        MessageKind.CONTRACT_RESENT,
        MessageKind.CONTRACT_ACCEPTED,
        MessageKind.CONTRACT_PAID,
      ]),
    );
  });

  it('authenticates and participant-filters realtime message subscriptions', async () => {
    const url = `${appUrl.replace(/^http/, 'ws')}/graphql`;
    const subscription = {
      query: `subscription MessageAdded($conversationId: String!) {
        messageAdded(conversationId: $conversationId) { id content conversationId }
      }`,
      variables: { conversationId: transactionConversationId },
    };

    const unauthenticated = createClient({
      url,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });
    const expectedWsError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const unauthenticatedError = await subscriptionError(
      unauthenticated,
      subscription,
    );
    expect(unauthenticatedError).toBeDefined();
    await unauthenticated.dispose();
    expectedWsError.mockRestore();

    const outsiderToken = jwt.sign(
      {
        sub: '00000000-0000-4000-8000-000000000099',
        email: 'outsider@example.com',
        type: 'user',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const outsider = createClient({
      url,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      connectionParams: { Authorization: `Bearer ${outsiderToken}` },
    });
    const outsiderError = await subscriptionError(outsider, subscription);
    expect(outsiderError).toBeDefined();
    await outsider.dispose();

    const customerToken = jwt.sign(
      transactionCustomer,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    let connected: () => void;
    const connectedPromise = new Promise<void>((resolve) => {
      connected = resolve;
    });
    const participant = createClient({
      url,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      connectionParams: { Authorization: `Bearer ${customerToken}` },
      on: { connected: () => connected() },
    });
    const received = subscriptionNext(participant, subscription);
    await connectedPromise;
    const sent = await app.get(MessageService).create(
      {
        conversationId: transactionConversationId,
        content: 'Realtime participant event',
      },
      transactionProvider,
    );
    await expect(received).resolves.toMatchObject({
      data: { messageAdded: { id: sent.id, content: sent.content } },
    });
    await participant.dispose();
  });

  it('features a listing only after its premium fee is paid through checkout, and downgrades on expiry', async () => {
    const dataSource = app.get(DataSource);
    const country = await dataSource.getRepository(Country).save({
      nameEn: 'Premium Country',
      nameAr: 'دولة الإعلان',
      code: 'PR-E2E',
      dialCode: '+970',
    });
    const city = await dataSource.getRepository(City).save({
      countryId: country.id,
      nameEn: 'Premium City',
      nameAr: 'مدينة الإعلان',
    });
    const category = await dataSource.getRepository(Category).save({
      image: 'premium.png',
      nameEn: 'Premium category',
      nameAr: 'فئة الإعلان',
      descriptionEn: 'Premium category description',
      descriptionAr: 'وصف فئة الإعلان',
    });
    const provider = await dataSource.getRepository(Provider).save({
      name: 'Premium Provider',
      commercialName: 'Premium Services',
      phone: '+970500000303',
      email: 'premium-provider@example.com',
      password: '',
      status: ProviderStatus.ACTIVE,
      cityId: city.id,
      countryId: country.id,
    });
    await dataSource.getRepository(SignedContract).save({
      providerId: provider.id,
      status: SignedContractStatus.ACTIVE,
      serviceProviderSignature: 'provider-signature',
      platformManagerName: 'Platform Manager',
      platformManagerSignature: 'manager-signature',
      contractSignedAt: new Date(),
      terminationReason: null,
      deletedAt: null,
    });
    await app.get(SettingService).setSetting({
      premiumAdEnabled: true,
      premiumAdFee: 99,
      premiumAdDurationDays: 30,
    });
    const created = await app.get(ListingService).create(
      {
        categoryId: category.id,
        cityId: city.id,
        name: 'Featured premium listing',
        description:
          'This premium listing becomes featured once its fee is paid.',
        price: 250,
        type: ListingType.FEATURED,
        story: {
          id: 'premium-story',
          filename: 'premium.mp4',
          originalFilename: 'premium.mp4',
          size: 1,
          type: MediaType.VIDEO,
          sortOrder: 0,
        },
        photos: [],
      },
      provider.id,
    );
    // S4-10: published as a normal ad until the premium fee is paid.
    expect(created).toMatchObject({
      status: ListingStatus.ACTIVE,
      type: ListingType.FREE,
      promotionStatus: PromotionStatus.PENDING_PAYMENT,
      featuredStartsAt: null,
    });
    expect(
      await dataSource.getRepository(Payment).count({
        where: { listingId: created.id, purpose: PaymentPurpose.PREMIUM_AD },
      }),
    ).toBe(0);
    const providerPrincipal = {
      sub: provider.id,
      email: provider.email,
      type: 'provider',
    } as JwtPayload;
    const checkout = await app.get(PaymentCheckoutService).startCheckout(
      {
        purpose: CheckoutPurpose.PREMIUM_AD,
        targetId: created.id,
        method: PaymentMethod.ELECTRONIC,
      },
      providerPrincipal,
    );
    await request(app.getHttpServer())
      .post(new URL(checkout.redirectUrl).pathname)
      .type('form')
      .send({ outcome: 'SUCCEEDED' })
      .expect(303);
    const listing = await dataSource
      .getRepository(Listing)
      .findOneByOrFail({ id: created.id });
    expect(listing).toMatchObject({
      status: ListingStatus.ACTIVE,
      type: ListingType.FEATURED,
      promotionStatus: PromotionStatus.ACTIVE,
      promotionCycle: 1,
    });
    expect(listing.featuredStartsAt).toBeTruthy();
    expect(listing.featuredEndsAt).toBeTruthy();
    await expect(
      app.get(ListingService).findOne(listing.id),
    ).resolves.toMatchObject({ id: listing.id });
    expect(
      await dataSource.getRepository(Payment).findOneByOrFail({
        listingId: listing.id,
        purpose: PaymentPurpose.PREMIUM_AD,
      }),
    ).toMatchObject({ status: PaymentStatus.COMPLETED, amount: '99.00' });

    listing.featuredEndsAt = new Date(Date.now() - 1_000);
    await dataSource.getRepository(Listing).save(listing);
    await app.get(ListingService).expireFeaturedPromotions();
    const expired = await dataSource.getRepository(Listing).findOneByOrFail({
      id: listing.id,
    });
    expect(expired).toMatchObject({
      type: ListingType.FREE,
      status: ListingStatus.ACTIVE,
      promotionStatus: PromotionStatus.EXPIRED,
    });
  });

  it('lets only the customer rate a completed contract once and keeps averages in sync with moderation', async () => {
    const dataSource = app.get(DataSource);
    const contractService = app.get(ContractService);
    type GraphqlBody<T> = {
      data: T;
      errors?: Array<{ message: string }>;
    };
    type RatedContract = {
      rateContract: { id: string; status: string; contractId: string };
    };
    type Reviews = {
      listingReviews: { items: unknown[]; meta: { total: number } };
    };
    const graphql = async <T = unknown>(
      query: string,
      variables: object,
      token?: string,
    ): Promise<GraphqlBody<T>> => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(token ? { Authorization: `Bearer ${token}` } : {})
        .send({ query, variables });
      return response.body as GraphqlBody<T>;
    };
    const tokenFor = (principal: JwtPayload) =>
      jwt.sign(principal, process.env.JWT_SECRET!, { expiresIn: '5m' });
    const rate = `mutation Rate($input: RateContractInput!) {
      rateContract(input: $input) { id rating comment status contractId }
    }`;
    const input = {
      contractId: transactionContractId,
      rating: 4,
      comment: 'Great work, on time',
    };

    const early = await graphql(rate, { input }, tokenFor(transactionCustomer));
    expect(early.errors?.[0]?.message).toContain('completed contracts');

    await contractService.providerCompleteContract(
      {
        contractId: transactionContractId,
        signatureData: 'provider-completion-signature',
      },
      transactionProvider,
    );
    await contractService.completeContract(
      { contractId: transactionContractId },
      transactionCustomer,
    );

    const anonymous = await graphql(rate, { input });
    expect(anonymous.errors?.[0]).toBeDefined();
    const asProvider = await graphql(
      rate,
      { input },
      tokenFor(transactionProvider),
    );
    expect(asProvider.errors?.[0]?.message).toContain('not authorized');

    const rated = await graphql<RatedContract>(
      rate,
      { input },
      tokenFor(transactionCustomer),
    );
    expect(rated.errors).toBeUndefined();
    expect(rated.data.rateContract).toMatchObject({
      rating: 4,
      comment: 'Great work, on time',
      status: 'PUBLISHED',
      contractId: transactionContractId,
    });
    const duplicate = await graphql(
      rate,
      { input },
      tokenFor(transactionCustomer),
    );
    expect(duplicate.errors?.[0]?.message).toContain('already rated');

    const reviews = await graphql<Reviews>(
      `
        query Reviews($input: ListingReviewsInput!) {
          listingReviews(input: $input) {
            items {
              rating
              comment
              reviewerName
            }
            meta {
              total
            }
          }
        }
      `,
      { input: { listingId: transactionListingId } },
    );
    expect(reviews.data.listingReviews).toEqual({
      items: [
        {
          rating: 4,
          comment: 'Great work, on time',
          reviewerName: 'Sprint Customer',
        },
      ],
      meta: { total: 1 },
    });

    const adminList = await graphql('{ adminRatings { meta { total } } }', {});
    expect(adminList.errors?.[0]).toBeDefined();

    const aggregates = async () => {
      const listing = await dataSource
        .getRepository(Listing)
        .findOneByOrFail({ id: transactionListingId });
      const provider = await dataSource
        .getRepository(Provider)
        .findOneByOrFail({ id: transactionProvider.sub });
      return {
        listing: [listing.ratingAverage, listing.ratingCount],
        provider: [provider.ratingAverage, provider.ratingCount],
      };
    };
    expect(await aggregates()).toEqual({ listing: [4, 1], provider: [4, 1] });

    await app
      .get(RatingService)
      .setStatus(rated.data.rateContract.id, RatingStatus.HIDDEN, {
        sub: '00000000-0000-4000-8000-0000000000ad',
        email: 'admin@example.com',
        permissionType: AdminPermissionType.SUPER_ADMIN,
      });
    expect(await aggregates()).toEqual({ listing: [0, 0], provider: [0, 0] });
    const hiddenReviews = await graphql<Reviews>(
      `
        query Reviews($input: ListingReviewsInput!) {
          listingReviews(input: $input) {
            meta {
              total
            }
          }
        }
      `,
      { input: { listingId: transactionListingId } },
    );
    expect(hiddenReviews.data.listingReviews.meta.total).toBe(0);
  });

  it('serves live statistics: public to visitors, dashboard to admins only, pushed on change', async () => {
    const dataSource = app.get(DataSource);
    const url = `${appUrl.replace(/^http/, 'ws')}/graphql`;
    type Platform = {
      completedContracts: number;
      providers: number;
      customers: number;
    };
    type Dashboard = Platform & {
      messagesToday: number;
      featuredListings: number;
      freeListings: number;
    };
    const graphql = async <T>(query: string, token?: string) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(token ? { Authorization: `Bearer ${token}` } : {})
        .send({ query });
      return response.body as {
        data: T | null;
        errors?: Array<{ message: string }>;
      };
    };
    const platformQuery = `{ platformStats { completedContracts providers customers } }`;
    const dashboardFields = `customers providers completedContracts messagesToday featuredListings freeListings`;
    const adminToken = jwt.sign(
      {
        sub: '00000000-0000-4000-8000-0000000000ad',
        email: 'stats-admin@example.com',
        permissionType: AdminPermissionType.SUPER_ADMIN,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const customerToken = jwt.sign(
      transactionCustomer,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );

    // Public query works for visitors and reflects the earlier completed contract.
    const before = await graphql<{ platformStats: Platform }>(platformQuery);
    expect(before.errors).toBeUndefined();
    const baseline = before.data!.platformStats;
    expect(baseline.completedContracts).toBeGreaterThanOrEqual(1);
    expect(baseline.customers).toBeGreaterThanOrEqual(1);

    // The admin dashboard is refused without a token and for customers.
    const dashboardQuery = `{ adminDashboardStats { ${dashboardFields} } }`;
    expect((await graphql(dashboardQuery)).errors).toBeDefined();
    expect((await graphql(dashboardQuery, customerToken)).errors).toBeDefined();
    const dashboard = await graphql<{ adminDashboardStats: Dashboard }>(
      dashboardQuery,
      adminToken,
    );
    expect(dashboard.errors).toBeUndefined();
    const dashboardBaseline = dashboard.data!.adminDashboardStats;
    expect(dashboardBaseline).toMatchObject(baseline);

    // Only active accounts count.
    const existing = await dataSource
      .getRepository(User)
      .findOneByOrFail({ id: transactionCustomer.sub });
    await dataSource.getRepository(User).save({
      name: 'Inactive Stats Customer',
      phone: '+966500000901',
      email: 'stats-inactive@example.com',
      password: '',
      status: UserStatus.INACTIVE,
      cityId: existing.cityId,
      countryId: existing.countryId,
      address: 'Stats address',
    });
    const afterInactive = await graphql<{ platformStats: Platform }>(
      platformQuery,
    );
    expect(afterInactive.data!.platformStats.customers).toBe(
      baseline.customers,
    );

    // A visitor's anonymous connection receives the public push.
    let visitorConnected: () => void;
    const visitorReady = new Promise<void>((resolve) => {
      visitorConnected = resolve;
    });
    const visitor = createClient({
      url,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      on: { connected: () => visitorConnected() },
    });
    const publicPush = subscriptionUntil<{ platformStatsUpdated: Platform }>(
      visitor,
      {
        query: `subscription { platformStatsUpdated { completedContracts providers customers } }`,
      },
      (value) =>
        value.platformStatsUpdated.customers === baseline.customers + 1,
    );
    await visitorReady;
    await waitForSubscriptionRegistration();
    await dataSource.getRepository(User).save({
      name: 'Active Stats Customer',
      phone: '+966500000902',
      email: 'stats-active@example.com',
      password: '',
      status: UserStatus.ACTIVE,
      cityId: existing.cityId,
      countryId: existing.countryId,
      address: 'Stats address',
    });
    await expect(publicPush).resolves.toMatchObject({
      platformStatsUpdated: { customers: baseline.customers + 1 },
    });
    await visitor.dispose();

    // The admin push is refused on anonymous and customer connections...
    const adminSubscription = {
      query: `subscription { adminDashboardStatsUpdated { ${dashboardFields} } }`,
    };
    const expectedWsError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    for (const connectionParams of [
      undefined,
      { Authorization: `Bearer ${customerToken}` },
    ]) {
      const refused = createClient({
        url,
        webSocketImpl: WebSocket,
        retryAttempts: 0,
        connectionParams,
      });
      await expect(
        subscriptionError(refused, adminSubscription),
      ).resolves.toBeDefined();
      await refused.dispose();
    }
    expectedWsError.mockRestore();

    // ...and delivered to an admin when someone sends a chat message.
    let adminConnected: () => void;
    const adminReady = new Promise<void>((resolve) => {
      adminConnected = resolve;
    });
    const admin = createClient({
      url,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      connectionParams: { Authorization: `Bearer ${adminToken}` },
      on: { connected: () => adminConnected() },
    });
    const adminPush = subscriptionUntil<{
      adminDashboardStatsUpdated: Dashboard;
    }>(
      admin,
      adminSubscription,
      (value) =>
        value.adminDashboardStatsUpdated.messagesToday ===
        dashboardBaseline.messagesToday + 1,
    );
    await adminReady;
    await waitForSubscriptionRegistration();
    await app.get(MessageService).create(
      {
        conversationId: transactionConversationId,
        content: 'Counts toward today',
      },
      transactionCustomer,
    );
    await expect(adminPush).resolves.toMatchObject({
      adminDashboardStatsUpdated: {
        messagesToday: dashboardBaseline.messagesToday + 1,
        customers: baseline.customers + 1,
      },
    });
    await admin.dispose();
  });

  it('assigns monthly badges, orders listings by tier, and deletes providers still under improvement', async () => {
    const dataSource = app.get(DataSource);
    const graphql = async <T>(
      query: string,
      variables: object = {},
      token?: string,
    ) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(token ? { Authorization: `Bearer ${token}` } : {})
        .send({ query, variables });
      return response.body as {
        data: T | null;
        errors?: Array<{ message: string }>;
      };
    };
    const adminToken = jwt.sign(
      {
        sub: '00000000-0000-4000-8000-0000000000ad',
        email: 'badge-admin@example.com',
        permissionType: AdminPermissionType.SUPER_ADMIN,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const updateSettings = `mutation Update($input: UpdateBadgeSettingsInput!) {
      updateBadgeSettings(input: $input) { tier maxBound minBound enabled }
    }`;
    const trust = {
      tier: 'TRUST',
      maxBound: 'EQ_5',
      minBound: 'EQ_4',
      enabled: true,
    };
    const diligence = {
      tier: 'DILIGENCE',
      maxBound: 'LT_4',
      minBound: 'EQ_3',
      enabled: true,
    };
    const underImprovement = {
      tier: 'UNDER_IMPROVEMENT',
      maxBound: 'LT_3',
      minBound: 'ZERO',
      enabled: true,
    };

    // Only admins may change settings, and overlapping ranges are refused.
    const customerToken = jwt.sign(
      transactionCustomer,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    expect(
      (
        await graphql(
          updateSettings,
          { input: { settings: [trust] } },
          customerToken,
        )
      ).errors,
    ).toBeDefined();
    const overlapping = await graphql(
      updateSettings,
      {
        input: {
          settings: [
            trust,
            { ...diligence, maxBound: 'EQ_4' },
            underImprovement,
          ],
        },
      },
      adminToken,
    );
    expect(overlapping.errors?.[0]?.message).toContain('must not overlap');
    const saved = await graphql<{
      updateBadgeSettings: Array<{ tier: string; enabled: boolean }>;
    }>(
      updateSettings,
      { input: { settings: [trust, diligence, underImprovement] } },
      adminToken,
    );
    expect(saved.errors).toBeUndefined();
    expect(saved.data!.updateBadgeSettings.map((s) => s.tier)).toEqual([
      'TRUST',
      'DILIGENCE',
      'UNDER_IMPROVEMENT',
    ]);

    // Two rated providers next to the (unrated) transaction provider.
    const baseListing = await dataSource
      .getRepository(Listing)
      .findOneByOrFail({ id: transactionListingId });
    const makeProvider = async (
      label: string,
      phone: string,
      ratingAverage: number,
    ) => {
      const created = await dataSource.getRepository(Provider).save({
        name: `${label} Provider`,
        commercialName: label,
        phone,
        email: `${label.toLowerCase()}-badge@example.com`,
        password: '',
        status: ProviderStatus.ACTIVE,
        cityId: baseListing.cityId,
        address: 'Badge address',
        languageCode: 'en',
      });
      await dataSource
        .getRepository(Provider)
        .update(created.id, { ratingAverage, ratingCount: 3 });
      const listing = await dataSource.getRepository(Listing).save({
        providerId: created.id,
        categoryId: baseListing.categoryId,
        cityId: baseListing.cityId,
        name: `${label} listing`,
        description: 'A listing used by the badge e2e flow.',
        price: 100,
        status: ListingStatus.ACTIVE,
        type: ListingType.FREE,
        promotionStatus: PromotionStatus.NONE,
        promotionCycle: 0,
        story: baseListing.story,
        photos: [],
        tags: '',
      });
      return { provider: created, listing };
    };
    const trusted = await makeProvider('Trusty', '+966500000301', 4.8);
    const lowly = await makeProvider('Lowly', '+966500000302', 2);
    await dataSource.getRepository(SignedContract).save({
      providerId: lowly.provider.id,
      status: SignedContractStatus.ACTIVE,
      serviceProviderSignature: 'provider-signature',
      platformManagerName: 'Platform Manager',
      platformManagerSignature: 'manager-signature',
      contractSignedAt: new Date(),
      terminationReason: null,
      deletedAt: null,
    });

    const runMutation = `mutation { runBadgeAssignment {
      period trustCount diligenceCount underImprovementCount changedCount
      deletedProviders { id } skippedProviders { id }
    } }`;
    const firstRun = await graphql<{
      runBadgeAssignment: {
        trustCount: number;
        underImprovementCount: number;
        deletedProviders: unknown[];
      };
    }>(runMutation, {}, adminToken);
    expect(firstRun.errors).toBeUndefined();
    expect(firstRun.data!.runBadgeAssignment).toMatchObject({
      trustCount: 1,
      underImprovementCount: 1,
      deletedProviders: [],
    });
    const badgeOf = async (id: string) =>
      (await dataSource.getRepository(Provider).findOneByOrFail({ id })).badge;
    expect(await badgeOf(trusted.provider.id)).toBe('TRUST');
    expect(await badgeOf(lowly.provider.id)).toBe('UNDER_IMPROVEMENT');
    expect(await badgeOf(transactionProvider.sub)).toBeNull();
    const notifications = await dataSource.query<
      Array<{ recipientId: string; type: string }>
    >(
      `SELECT "recipientId", type FROM notifications WHERE type IN ('BADGE_CHANGED', 'BADGE_WARNING')`,
    );
    expect(notifications).toEqual(
      expect.arrayContaining([
        { recipientId: trusted.provider.id, type: 'BADGE_CHANGED' },
        { recipientId: lowly.provider.id, type: 'BADGE_WARNING' },
      ]),
    );

    // The same month cannot run twice.
    const secondRun = await graphql(runMutation, {}, adminToken);
    expect(secondRun.errors?.[0]?.message).toContain(
      'already been assigned for this month',
    );

    // Category order: Trust, then no badge, then Under-improvement.
    const ordered = await graphql<{
      listings: { items: Array<{ id: string }> };
    }>(
      `
        query Listings($input: ListingPaginationInput!) {
          listings(paginationInput: $input) {
            items {
              id
            }
          }
        }
      `,
      { input: { categoryId: baseListing.categoryId, page: 1, limit: 20 } },
    );
    expect(ordered.errors).toBeUndefined();
    const ids = ordered.data!.listings.items.map((item) => item.id);
    expect(ids.indexOf(trusted.listing.id)).toBeLessThan(
      ids.indexOf(transactionListingId),
    );
    expect(ids.indexOf(transactionListingId)).toBeLessThan(
      ids.indexOf(lowly.listing.id),
    );

    // Home carousel: one ad per Trust provider, and its featured ad wins.
    const trustedQuery = `{ trustedListings { id provider { id } } }`;
    const trustedBefore = await graphql<{
      trustedListings: Array<{ id: string; provider: { id: string } }>;
    }>(trustedQuery);
    expect(trustedBefore.errors).toBeUndefined();
    expect(trustedBefore.data!.trustedListings).toEqual([
      { id: trusted.listing.id, provider: { id: trusted.provider.id } },
    ]);
    const { id: _baseId, ...trustedListingFields } = trusted.listing;
    void _baseId;
    const featured = await dataSource.getRepository(Listing).save({
      ...trustedListingFields,
      name: 'Trusty featured listing',
      type: ListingType.FEATURED,
      promotionStatus: PromotionStatus.ACTIVE,
      featuredStartsAt: new Date(),
      featuredEndsAt: new Date(Date.now() + 86_400_000),
    });
    const trustedAfter = await graphql<{
      trustedListings: Array<{ id: string }>;
    }>(trustedQuery);
    expect(trustedAfter.data!.trustedListings.map((l) => l.id)).toEqual([
      featured.id,
    ]);

    // A month later: skipped while a contract is unfinished...
    const badgeService = app.get(BadgeService);
    const contracts = dataSource.getRepository(Contract);
    const contract = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    await contracts.update(contract.id, {
      providerId: lowly.provider.id,
      status: ContractStatus.IN_PROGRESS,
    });
    const skippedRun = await badgeService.runAssignment('2099-01', 'en');
    expect(skippedRun.skippedProviders).toEqual([
      { id: lowly.provider.id, name: 'Lowly Provider' },
    ]);
    expect(
      (
        await dataSource.getRepository(Provider).findOneByOrFail({
          id: lowly.provider.id,
        })
      ).deletedAt,
    ).toBeNull();
    await contracts.update(contract.id, {
      providerId: contract.providerId,
      status: contract.status,
    });

    // ...and deleted the next month once nothing is open.
    const deletedRun = await badgeService.runAssignment('2099-02', 'en');
    expect(deletedRun.deletedProviders).toEqual([
      { id: lowly.provider.id, name: 'Lowly Provider' },
    ]);
    const deletedProvider = await dataSource
      .getRepository(Provider)
      .findOneByOrFail({ id: lowly.provider.id });
    expect(deletedProvider).toMatchObject({
      status: ProviderStatus.DELETED,
      isActive: false,
    });
    expect(deletedProvider.deletedAt).not.toBeNull();
    expect(deletedProvider.email).toMatch(/^DELETED_/);
    expect(
      (
        await dataSource
          .getRepository(SignedContract)
          .findOneByOrFail({ providerId: lowly.provider.id })
      ).status,
    ).toBe(SignedContractStatus.TERMINATED_BY_ADMIN);
    expect(
      (
        await dataSource
          .getRepository(Listing)
          .findOneByOrFail({ id: lowly.listing.id })
      ).status,
    ).toBe(ListingStatus.INACTIVE);
    expect(await badgeOf(trusted.provider.id)).toBe('TRUST');

    const lastRun = await graphql<{ badgeLastRun: { period: string } }>(
      `
        {
          badgeLastRun {
            period
          }
        }
      `,
      {},
      adminToken,
    );
    expect(lastRun.data!.badgeLastRun.period).toBe('2099-02');
  });

  it('sends admin broadcasts live to customers and pushes admin header notifications', async () => {
    const dataSource = app.get(DataSource);
    const url = `${appUrl.replace(/^http/, 'ws')}/graphql`;
    const graphql = async <T>(
      query: string,
      variables: object = {},
      token?: string,
    ) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(token ? { Authorization: `Bearer ${token}` } : {})
        .send({ query, variables });
      return response.body as {
        data: T | null;
        errors?: Array<{ message: string }>;
      };
    };
    const admin = await dataSource.getRepository(Admin).save({
      email: 'notify-admin@example.com',
      fullName: 'Notify Admin',
      organizationName: 'Wesal',
      roleName: 'Super admin',
      permissionType: AdminPermissionType.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    });
    const adminToken = jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        permissionType: AdminPermissionType.SUPER_ADMIN,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const customerToken = jwt.sign(
      transactionCustomer,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const sendBroadcast = `mutation Send($input: SendBroadcastInput!) {
      sendBroadcast(input: $input) { id recipientCount audience }
    }`;
    const broadcastInput = {
      title: 'Planned maintenance',
      message: 'The platform will be unavailable at 2am.',
      recipientTypes: ['USER'],
      audience: 'SELECTED',
      recipients: [{ id: transactionCustomer.sub, type: 'USER' }],
    };

    // Customers cannot broadcast.
    expect(
      (await graphql(sendBroadcast, { input: broadcastInput }, customerToken))
        .errors,
    ).toBeDefined();

    // The selected customer receives it live on the existing channel.
    let customerConnected: () => void;
    const customerReady = new Promise<void>((resolve) => {
      customerConnected = resolve;
    });
    const customer = createClient({
      url,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      connectionParams: { Authorization: `Bearer ${customerToken}` },
      on: { connected: () => customerConnected() },
    });
    const received = subscriptionUntil<{
      notificationAdded: { type: string; title: string };
    }>(
      customer,
      {
        query: `subscription { notificationAdded { type title relatedEntityType } }`,
      },
      (value) => value.notificationAdded.title === broadcastInput.title,
    );
    await customerReady;
    await waitForSubscriptionRegistration();
    const sent = await graphql<{
      sendBroadcast: { id: string; recipientCount: number };
    }>(sendBroadcast, { input: broadcastInput }, adminToken);
    expect(sent.errors).toBeUndefined();
    expect(sent.data!.sendBroadcast.recipientCount).toBe(1);
    await expect(received).resolves.toMatchObject({
      notificationAdded: { type: 'SYSTEM_ANNOUNCEMENT' },
    });
    await customer.dispose();

    const listed = await graphql<{
      adminBroadcasts: { items: Array<{ id: string }> };
    }>(
      `
        {
          adminBroadcasts(input: { search: "maintenance" }) {
            items {
              id
            }
          }
        }
      `,
      {},
      adminToken,
    );
    expect(listed.data!.adminBroadcasts.items.map((b) => b.id)).toContain(
      sent.data!.sendBroadcast.id,
    );

    // A contact-us message reaches the admin header bell live.
    let adminConnected: () => void;
    const adminReady = new Promise<void>((resolve) => {
      adminConnected = resolve;
    });
    const adminSocket = createClient({
      url,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      connectionParams: { Authorization: `Bearer ${adminToken}` },
      on: { connected: () => adminConnected() },
    });
    const adminPush = subscriptionUntil<{
      adminNotificationAdded: {
        id: string;
        type: string;
        translations: unknown;
      };
    }>(
      adminSocket,
      {
        query: `subscription { adminNotificationAdded { id type title translations } }`,
      },
      (value) => value.adminNotificationAdded.type === 'ADMIN_CONTACT_MESSAGE',
    );
    await adminReady;
    await waitForSubscriptionRegistration();
    const contact = await graphql(
      `
        mutation Contact($input: CreateContactMessageInput!) {
          createContactMessage(createContactMessageInput: $input) {
            id
          }
        }
      `,
      {
        input: {
          name: 'Visitor Sara',
          email: 'sara@example.com',
          phone: '+966500000777',
          messageContent: 'Hello there',
        },
      },
    );
    expect(contact.errors).toBeUndefined();
    const pushed = await adminPush;
    expect(pushed.adminNotificationAdded.translations).toMatchObject({
      en: { title: 'New contact message' },
    });
    await adminSocket.dispose();

    // Read state: one, then all.
    const feed = async () =>
      (
        await graphql<{
          adminNotifications: { items: Array<{ id: string; isRead: boolean }> };
          adminUnreadNotificationCount: number;
        }>(
          `
            {
              adminNotifications {
                items {
                  id
                  isRead
                }
              }
              adminUnreadNotificationCount
            }
          `,
          {},
          adminToken,
        )
      ).data!;
    const before = await feed();
    expect(before.adminUnreadNotificationCount).toBeGreaterThanOrEqual(1);
    await graphql(
      `
        mutation Read($id: ID!) {
          adminMarkNotificationRead(id: $id) {
            id
          }
        }
      `,
      { id: pushed.adminNotificationAdded.id },
      adminToken,
    );
    const afterOne = await feed();
    expect(
      afterOne.adminNotifications.items.find(
        (n) => n.id === pushed.adminNotificationAdded.id,
      )?.isRead,
    ).toBe(true);
    await graphql(
      `
        mutation {
          adminMarkAllNotificationsRead
        }
      `,
      {},
      adminToken,
    );
    expect((await feed()).adminUnreadNotificationCount).toBe(0);
    // Customers never see admin rows in their own feed.
    expect(
      (
        await graphql(
          `
            {
              adminNotifications {
                items {
                  id
                }
              }
            }
          `,
          {},
          customerToken,
        )
      ).errors,
    ).toBeDefined();
  });

  it('flags Wesal Al-Khair contracts and totals them for admins only', async () => {
    const dataSource = app.get(DataSource);
    const graphql = async <T>(
      query: string,
      variables: object = {},
      token?: string,
    ) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(token ? { Authorization: `Bearer ${token}` } : {})
        .send({ query, variables });
      return response.body as {
        data: T | null;
        errors?: Array<{ message: string }>;
      };
    };
    const customerToken = jwt.sign(
      transactionCustomer,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const adminToken = jwt.sign(
      {
        sub: '00000000-0000-4000-8000-0000000000ad',
        email: 'charity-admin@example.com',
        permissionType: AdminPermissionType.SUPER_ADMIN,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const quote = `query Quote($input: ContractQuoteInput!) {
      contractQuote(input: $input) { commissionAmount isCharity charityAmount providerNetAmount }
    }`;

    // Category: 2% commission, 5 SAR minimum.
    const small = await graphql<{
      contractQuote: { isCharity: boolean; charityAmount: number };
    }>(
      quote,
      {
        input: { conversationId: transactionConversationId, agreedPrice: 200 },
      },
      customerToken,
    );
    expect(small.errors).toBeUndefined();
    expect(small.data!.contractQuote).toEqual({
      commissionAmount: 4,
      isCharity: true,
      charityAmount: 4,
      providerNetAmount: 196,
    });
    const large = await graphql<{ contractQuote: { isCharity: boolean } }>(
      quote,
      {
        input: { conversationId: transactionConversationId, agreedPrice: 500 },
      },
      customerToken,
    );
    expect(large.data!.contractQuote).toMatchObject({
      isCharity: false,
      commissionAmount: 10,
    });

    // Mark the completed transaction contract as charity to exercise the lists.
    await dataSource
      .getRepository(Contract)
      .update(transactionContractId, { isCharity: true, charityAmount: 10 });

    const mine = await graphql<{
      contracts: { items: Array<{ id: string; isCharity: boolean }> };
    }>(
      `
        {
          contracts(input: { isCharity: true }) {
            items {
              id
              isCharity
            }
          }
        }
      `,
      {},
      customerToken,
    );
    expect(mine.data!.contracts.items).toEqual([
      { id: transactionContractId, isCharity: true },
    ]);

    const adminQuery = `{
      adminCharitySummary { contracts completedContracts totalAmount }
      adminCharityContracts { items { id } meta { total } }
    }`;
    expect((await graphql(adminQuery, {}, customerToken)).errors).toBeDefined();
    const admin = await graphql<{
      adminCharitySummary: {
        contracts: number;
        completedContracts: number;
        totalAmount: number;
      };
      adminCharityContracts: { meta: { total: number } };
    }>(adminQuery, {}, adminToken);
    expect(admin.errors).toBeUndefined();
    expect(admin.data!.adminCharitySummary).toEqual({
      contracts: 1,
      completedContracts: 1,
      totalAmount: 10,
    });
    expect(admin.data!.adminCharityContracts.meta.total).toBe(1);

    await dataSource
      .getRepository(Contract)
      .update(transactionContractId, { isCharity: false, charityAmount: 0 });
  });

  it('fills new categories from the Settings defaults and blocks deactivation with open contracts', async () => {
    const dataSource = app.get(DataSource);
    const graphql = async <T>(query: string, variables: object = {}) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set({ Authorization: `Bearer ${adminToken}`, 'Accept-Language': 'en' })
        .send({ query, variables });
      return response.body as {
        data: T | null;
        errors?: Array<{ message: string }>;
      };
    };
    const adminToken = jwt.sign(
      {
        sub: '00000000-0000-4000-8000-0000000000ae',
        email: 'category-admin@example.com',
        permissionType: AdminPermissionType.SUPER_ADMIN,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    await app.get(SettingService).setSetting({
      defaultCommissionPercent: 3,
      defaultMinCommissionAmount: 15,
      defaultMaxExecutionHours: 48,
    });

    const created = await graphql<{
      createCategory: {
        id: string;
        commissionPercent: number;
        minCommissionAmount: number;
        maxExecutionHours: number;
        depositPercent: number;
        undertakingTextEn: string;
      };
    }>(
      `
        mutation Create($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            id
            commissionPercent
            minCommissionAmount
            maxExecutionHours
            depositPercent
            undertakingTextEn
          }
        }
      `,
      {
        input: {
          image: 'category.png',
          nameEn: 'Defaults',
          nameAr: 'افتراضي',
          descriptionEn: 'Defaults',
          descriptionAr: 'افتراضي',
          rulesEn: 'Rules',
          rulesAr: 'شروط',
        },
      },
    );
    expect(created.errors).toBeUndefined();
    expect(created.data!.createCategory).toMatchObject({
      commissionPercent: 3,
      minCommissionAmount: 15,
      maxExecutionHours: 48,
      depositPercent: 0,
    });
    expect(created.data!.createCategory.undertakingTextEn).toContain(
      '{commission}%',
    );

    const deactivate = `mutation Deactivate($id: ID!) {
      deactivateCategory(id: $id) { id status }
    }`;
    const contracts = dataSource.getRepository(Contract);
    const contract = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    await contracts.update(contract.id, { status: ContractStatus.ACCEPTED });
    const blocked = await graphql(deactivate, { id: contract.categoryId });
    expect(blocked.errors?.[0].message).toContain('unfinished contracts');
    await contracts.update(contract.id, { status: contract.status });

    const free = await graphql<{ deactivateCategory: { status: string } }>(
      deactivate,
      { id: created.data!.createCategory.id },
    );
    expect(free.errors).toBeUndefined();
    expect(free.data!.deactivateCategory.status).toBe('INACTIVE');
  });
  it('reports every non-draft contract with BRD columns, filters and all-page totals', async () => {
    const dataSource = app.get(DataSource);
    const contracts = dataSource.getRepository(Contract);
    const paid = await contracts.findOneByOrFail({ id: transactionContractId });
    const {
      id: _id,
      publicId: _publicId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      version: _version,
      ...fields
    } = paid as Contract & { version?: number };
    void [_id, _publicId, _createdAt, _updatedAt, _version];
    const admin = await dataSource.getRepository(Admin).save({
      email: 'report-viewer@example.com',
      fullName: 'Report Viewer',
      organizationName: 'Wesal',
      roleName: 'Viewer',
      permissionType: AdminPermissionType.VIEWER,
      status: AdminStatus.ACTIVE,
    });
    const readPermission = await dataSource.getRepository(Permission).save({
      name: 'Read Report',
      nameAr: 'عرض التقارير',
      description: 'Read Report',
      module: 'report',
      action: 'read',
      resource: 'report',
      permissionPlatform: PermissionPlatform.ADMIN,
    });
    await dataSource
      .getRepository(AdminPermission)
      .save({ adminId: admin.id, permissionId: readPermission.id });
    const viewerToken = jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        permissionType: AdminPermissionType.VIEWER,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const report = async (input: object) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set({ Authorization: `Bearer ${viewerToken}` })
        .send({
          query: `query Report($input: FeeReportInput) {
            contractFinancialReport(input: $input) {
              items { contractId status providerNet vat adminProfit contractTotal isCharity deliveryCompanyNameEn }
              meta { total }
              completedCount totalProviderNet totalVat totalAdminProfit totalCharity totalContractValue
            }
          }`,
          variables: { input },
        });
      return response.body as {
        data: {
          contractFinancialReport: {
            items: Array<Record<string, unknown>>;
            meta: { total: number };
            completedCount: number;
            totalProviderNet: number;
            totalVat: number;
            totalAdminProfit: number;
            totalCharity: number;
            totalContractValue: number;
          };
        } | null;
        errors?: Array<{ message: string }>;
      };
    };

    const before = (await report({})).data!.contractFinancialReport;
    const unpaid = await contracts.save({
      ...fields,
      // (conversationId, version) is unique.
      version: Number(_version ?? 1) + 100,
      status: ContractStatus.PENDING,
      paidAt: null,
      isCharity: true,
      charityAmount: Number(paid.commissionAmount),
      deliveryCompanyId: '00000000-0000-4000-8000-00000000dc01',
      deliveryCompanyNameEn: 'Fast Delivery',
      deliveryCompanyNameAr: 'توصيل سريع',
    });

    // One row per page, but totals cover every filtered contract.
    const all = await report({ limit: 1 });
    expect(all.errors).toBeUndefined();
    const result = all.data!.contractFinancialReport;
    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(before.meta.total + 1);
    expect(result.completedCount).toBe(before.completedCount);
    const commission = Number(paid.commissionAmount);
    // The charity contract adds to the charity total, not to admin profit.
    expect(result.totalAdminProfit).toBe(before.totalAdminProfit);
    expect(result.totalCharity).toBe(before.totalCharity + commission);
    expect(result.totalProviderNet).toBe(
      before.totalProviderNet + Number(paid.providerNetAmount),
    );
    expect(result.totalContractValue).toBe(
      before.totalContractValue + Number(paid.totalPayable),
    );

    const delivered = await report({
      deliveryCompanyId: '00000000-0000-4000-8000-00000000dc01',
    });
    expect(delivered.data!.contractFinancialReport.items).toEqual([
      expect.objectContaining({
        contractId: unpaid.id,
        status: ContractStatus.PENDING,
        isCharity: true,
        adminProfit: 0,
        deliveryCompanyNameEn: 'Fast Delivery',
      }),
    ]);

    // report:read alone may view but not export (BRD export permission).
    await request(app.getHttpServer())
      .get('/reports/contracts/export?format=xlsx')
      .set({ Authorization: `Bearer ${viewerToken}` })
      .expect(403);

    await contracts.delete(unpaid.id);
  });
  it('serves a tax invoice PDF for a paid contract to admins only', async () => {
    const adminToken = jwt.sign(
      {
        sub: '00000000-0000-4000-8000-0000000000af',
        email: 'invoice-admin@example.com',
        permissionType: AdminPermissionType.SUPER_ADMIN,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const response = await request(app.getHttpServer())
      .get(`/contracts/${transactionContractId}/invoice?language=ar`)
      .set({ Authorization: `Bearer ${adminToken}` })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toMatch(/invoice-INV-/);
    expect((response.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');

    const customerToken = jwt.sign(
      transactionCustomer,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const forbidden = await request(app.getHttpServer())
      .get(`/contracts/${transactionContractId}/invoice`)
      .set({ Authorization: `Bearer ${customerToken}` });
    expect([401, 403]).toContain(forbidden.status);

    // S4-57: the paying customer downloads it from the participant route.
    const own = await request(app.getHttpServer())
      .get(`/contract-documents/${transactionContractId}/invoice?language=en`)
      .set({ Authorization: `Bearer ${customerToken}` })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(own.headers['content-disposition']).toMatch(/invoice-INV-/);
    expect((own.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');

    const providerToken = jwt.sign(
      transactionProvider,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    await request(app.getHttpServer())
      .get(`/contract-documents/${transactionContractId}/invoice`)
      .set({ Authorization: `Bearer ${providerToken}` })
      .expect(403);
  });
  it("notifies payment and payout in each reader's language", async () => {
    const providerToken = jwt.sign(
      transactionProvider,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const customerToken = jwt.sign(
      transactionCustomer,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const list = async (token: string, language: string) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set({ Authorization: `Bearer ${token}`, 'Accept-Language': language })
        .send({
          query: `{
            notifications(input: { limit: 50, sortOrder: DESC }) {
              items { type title message relatedEntityId }
            }
          }`,
        });
      const body = response.body as {
        data: {
          notifications: {
            items: Array<{
              type: string;
              title: string;
              message: string;
              relatedEntityId: string | null;
            }>;
          };
        } | null;
        errors?: Array<{ message: string }>;
      };
      expect(body.errors).toBeUndefined();
      return body.data!.notifications.items.filter(
        (item) => item.relatedEntityId === transactionContractId,
      );
    };

    const providerAr = await list(providerToken, 'ar');
    expect(providerAr).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'PAYMENT_RECEIVED',
          title: 'تم سداد قيمة التعاقد',
        }),
        expect.objectContaining({
          type: 'PAYOUT_TRANSFERRED',
          message: expect.stringContaining(
            'تم تحويل قيمة التعاقد رقم',
          ) as string,
        }),
      ]),
    );
    const customerEn = await list(customerToken, 'en');
    expect(customerEn).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'PAYMENT_RECEIVED',
          title: 'Order status updated',
        }),
      ]),
    );
  });

  it('filters My Contracts by BRD tab and hides drafts from the list', async () => {
    const contracts = app.get(DataSource).getRepository(Contract);
    const original = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    const customerToken = jwt.sign(
      transactionCustomer,
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );
    const list = async (input: object) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set({ Authorization: `Bearer ${customerToken}` })
        .send({
          query: `query List($input: ContractPaginationInput) {
            contracts(input: $input) { items { id status statusGroup } }
          }`,
          variables: { input },
        });
      const body = response.body as {
        data: {
          contracts: {
            items: Array<{ id: string; status: string; statusGroup: string }>;
          };
        } | null;
        errors?: Array<{ message: string }>;
      };
      expect(body.errors).toBeUndefined();
      return body.data!.contracts.items.map((item) => item.id);
    };

    try {
      // Provider finished, waiting for the customer: Figma's "In progress".
      await contracts.update(transactionContractId, {
        status: ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
      });
      expect(await list({ statusGroup: 'IN_PROGRESS' })).toContain(
        transactionContractId,
      );
      expect(await list({ statusGroup: 'COMPLETED' })).not.toContain(
        transactionContractId,
      );

      await contracts.update(transactionContractId, {
        status: ContractStatus.DRAFT,
      });
      expect(await list({})).not.toContain(transactionContractId);
      // A conversation's own contracts still include its draft (resume).
      expect(await list({ conversationId: original.conversationId })).toContain(
        transactionContractId,
      );
    } finally {
      await contracts.update(transactionContractId, {
        status: original.status,
      });
    }
  });

  it("hides the customer's identity from the provider until payment", async () => {
    const contracts = app.get(DataSource).getRepository(Contract);
    const original = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    const sign = (payload: object) =>
      jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '5m' });
    const client = async (token: string) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set({ Authorization: `Bearer ${token}` })
        .send({
          query: `query One($id: String!) {
            contract(id: $id) { client { id name phone email } }
          }`,
          variables: { id: transactionContractId },
        });
      const body = response.body as {
        data: {
          contract: {
            client: {
              id: string;
              name: string | null;
              phone: string;
              email: string;
            };
          };
        } | null;
        errors?: Array<{ message: string }>;
      };
      expect(body.errors).toBeUndefined();
      return body.data!.contract.client;
    };

    try {
      await contracts.update(transactionContractId, { paidAt: null });
      const masked = await client(sign(transactionProvider));
      expect(masked.name).toBeNull();
      expect(masked.phone).toBe('');
      expect(masked.email).toBe('');
      expect((await client(sign(transactionCustomer))).phone).not.toBe('');

      await contracts.update(transactionContractId, { paidAt: new Date() });
      expect((await client(sign(transactionProvider))).phone).not.toBe('');
    } finally {
      await contracts.update(transactionContractId, {
        paidAt: original.paidAt,
      });
    }
  });

  it('lists overdue contracts per party, flags them once and expires unpaid deals', async () => {
    const dataSource = app.get(DataSource);
    const contracts = dataSource.getRepository(Contract);
    const conversations = dataSource.getRepository(Conversation);
    const notifications = dataSource.getRepository(Notification);
    const service = app.get(ContractService);
    const original = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    const conversation = await conversations.findOneByOrFail({
      id: original.conversationId,
    });
    const sign = (payload: object) =>
      jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '5m' });
    const overdue = async (payload: object) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set({ Authorization: `Bearer ${sign(payload)}` })
        .send({
          query: '{ myOverdueContracts { id provider { id } client { id } } }',
        });
      const body = response.body as {
        data: { myOverdueContracts: Array<{ id: string }> } | null;
        errors?: Array<{ message: string }>;
      };
      expect(body.errors).toBeUndefined();
      return body.data!.myOverdueContracts.map((item) => item.id);
    };
    const overdueNotices = () =>
      notifications.count({
        where: {
          relatedEntityId: transactionContractId,
          type: 'CONTRACT_OVERDUE' as never,
        },
      });

    try {
      // Provider: 10 h of execution, paid 35 h ago (past 10 h + 24 h).
      await contracts.update(transactionContractId, {
        status: ContractStatus.IN_PROGRESS,
        executionHours: 10,
        paidAt: new Date(Date.now() - 35 * 3_600_000),
        providerOverdueAt: null,
        customerOverdueAt: null,
      });
      expect(await overdue(transactionProvider)).toContain(
        transactionContractId,
      );
      expect(await overdue(transactionCustomer)).not.toContain(
        transactionContractId,
      );
      await service.flagOverdueContracts();
      await service.flagOverdueContracts();
      expect(await overdueNotices()).toBe(1);
      expect(
        (await contracts.findOneByOrFail({ id: transactionContractId }))
          .providerOverdueAt,
      ).toBeInstanceOf(Date);

      // Customer: the confirmation deadline has passed.
      await contracts.update(transactionContractId, {
        status: ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
        confirmationDeadlineAt: new Date(Date.now() - 60_000),
      });
      expect(await overdue(transactionCustomer)).toContain(
        transactionContractId,
      );
      expect(await overdue(transactionProvider)).not.toContain(
        transactionContractId,
      );

      // Unpaid deal whose chat window ran out: removed once (BRD 4.1.16,
      // D-13), its number pooled. A clone, so the shared contract stays.
      await contracts.update(transactionContractId, {
        status: original.status,
        paidAt: original.paidAt,
      });
      const { id: _cloneId, publicId: _cloneNumber, ...fields } = original;
      void _cloneId;
      void _cloneNumber;
      const unpaid = await contracts.save(
        contracts.create({
          ...fields,
          status: ContractStatus.ACCEPTED,
          paidAt: null,
          version: original.version + 20,
          supersedesContractId: null,
        }),
      );
      await conversations.update(conversation.id, {
        expiresAt: new Date(Date.now() - 60_000),
      });
      await service.cancelExpiredUnpaidContracts();
      await service.cancelExpiredUnpaidContracts();
      expect(await contracts.findOneBy({ id: unpaid.id })).toBeNull();
      // The paid contract in the same chat is untouched.
      expect(
        (await contracts.findOneByOrFail({ id: transactionContractId })).status,
      ).toBe(original.status);
    } finally {
      await contracts.update(transactionContractId, {
        status: original.status,
        executionHours: original.executionHours,
        paidAt: original.paidAt,
        confirmationDeadlineAt: original.confirmationDeadlineAt,
        cancelledAt: original.cancelledAt,
        cancellationReason: original.cancellationReason,
        providerOverdueAt: null,
        customerOverdueAt: null,
      });
      await conversations.update(conversation.id, {
        expiresAt: conversation.expiresAt,
      });
    }
  });

  it('closes an admin payout as ADMIN_RESOLVED, never Completed (Q-C3)', async () => {
    const contracts = app.get(DataSource).getRepository(Contract);
    const original = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    const service = app.get(ContractService);
    try {
      await contracts.update(transactionContractId, {
        status: ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
        confirmationDeadlineAt: new Date(Date.now() - 60_000),
        completedAt: null,
        resolvedAt: null,
      });
      const resolved = await service.adminResolveContract(
        {
          contractId: transactionContractId,
          resolution: ContractResolution.COMPLETE,
          reason: 'Customer did not confirm in time',
        },
        {
          sub: '00000000-0000-4000-8000-0000000000af',
          email: 'resolve-admin@example.com',
          permissionType: AdminPermissionType.SUPER_ADMIN,
        },
      );
      expect(resolved.status).toBe(ContractStatus.ADMIN_RESOLVED);
      expect(resolved.resolvedAt).toBeInstanceOf(Date);
      expect(resolved.completedAt).toBeNull();

      // Only a customer-signed (COMPLETED) contract can be rated.
      await expect(
        app
          .get(RatingService)
          .rateContract(
            { contractId: transactionContractId, rating: 5 },
            transactionCustomer,
          ),
      ).rejects.toThrow('Only completed contracts can be rated');
    } finally {
      await contracts.update(transactionContractId, {
        status: original.status,
        confirmationDeadlineAt: original.confirmationDeadlineAt,
        completedAt: original.completedAt,
        resolvedAt: original.resolvedAt,
      });
    }
  });

  it('removes a contract cancelled before payment and reuses its number (D-13)', async () => {
    const dataSource = app.get(DataSource);
    const contracts = dataSource.getRepository(Contract);
    const template = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    const { id: _id, publicId: _number, ...fields } = template;
    void _id;
    void _number;
    const pending = await contracts.save(
      contracts.create({
        ...fields,
        status: ContractStatus.PENDING,
        paidAt: null,
        acceptedAt: null,
        completedAt: null,
        resolvedAt: null,
        supersedesContractId: null,
        // Newer than every version in the chat, so it may be changed.
        version: template.version + 10,
      }),
    );
    const number = Number(pending.publicId);

    const result = await app
      .get(ContractService)
      .requestCancellation(
        { contractId: pending.id, reason: 'Changed my mind' },
        transactionCustomer,
      );

    expect(result.status).toBe(ContractStatus.CANCELLED);
    expect(await contracts.findOneBy({ id: pending.id })).toBeNull();
    await expect(
      app.get(ContractService).findOne(pending.id, transactionCustomer),
    ).rejects.toThrow();
    // Released to the pool; the smallest pooled number is claimed first.
    const pool = await dataSource.query<Array<{ number: string }>>(
      'SELECT "number" FROM "contract_number_pool" ORDER BY "number"',
    );
    const numbers = pool.map((row) => Number(row.number));
    expect(numbers).toContain(number);
    const reused = await dataSource.transaction((manager) =>
      claimContractNumber(manager),
    );
    expect(reused).toBe(numbers[0]);
  });

  it('pays through the mock gateway: failure, retry, signed webhook, replay (S4-10)', async () => {
    const dataSource = app.get(DataSource);
    const contracts = dataSource.getRepository(Contract);
    const payments = dataSource.getRepository(Payment);
    const checkoutService = app.get(PaymentCheckoutService);
    const gateway = new MockPaymentGateway();
    const server = app.getHttpServer();
    const template = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    const { id: _id, publicId: _number, ...fields } = template;
    void _id;
    void _number;
    const clone = (versionOffset: number) =>
      contracts.save(
        contracts.create({
          ...fields,
          status: ContractStatus.ACCEPTED,
          paidAt: null,
          completedAt: null,
          resolvedAt: null,
          providerPaidNoticeAt: null,
          supersedesContractId: null,
          version: template.version + versionOffset,
        }),
      );
    const accepted = await clone(20);
    const input = {
      purpose: CheckoutPurpose.CONTRACT,
      targetId: accepted.id,
      method: PaymentMethod.TABBY,
    };

    // Tabby above its admin bound is hidden and refused.
    await app.get(SettingService).setSetting({ tabbyMaxAmount: 1 });
    await expect(
      checkoutService.startCheckout(input, transactionCustomer),
    ).rejects.toThrow('not available for this amount');
    await app.get(SettingService).setSetting({ tabbyMaxAmount: null });

    // 1. The customer fails on the hosted page and comes back.
    const first = await checkoutService.startCheckout(
      input,
      transactionCustomer,
      'ar',
    );
    const firstPath = new URL(first.redirectUrl).pathname;
    const page = await request(server).get(firstPath).expect(200);
    expect(page.text).toContain('تابي');
    const failed = await request(server)
      .post(firstPath)
      .type('form')
      .send({ outcome: 'FAILED' })
      .expect(303);
    expect(failed.headers.location).toBe(
      `https://web.e2e.test/ar/payments/return?paymentId=${first.paymentId}`,
    );
    expect(
      await payments.findOneByOrFail({ id: first.paymentId }),
    ).toMatchObject({
      status: PaymentStatus.FAILED,
      paymentMethod: PaymentMethod.TABBY,
    });
    expect(await contracts.findOneByOrFail({ id: accepted.id })).toMatchObject({
      status: ContractStatus.ACCEPTED,
      paidAt: null,
    });

    // 2. A retry reuses the payment row under a new reference.
    const retry = await checkoutService.startCheckout(
      { ...input, method: PaymentMethod.ELECTRONIC },
      transactionCustomer,
    );
    expect(retry.paymentId).toBe(first.paymentId);
    const reference = decodeURIComponent(
      new URL(retry.redirectUrl).pathname.split('/').pop()!,
    );
    expect(firstPath).not.toContain(reference);

    // Cancelling while the checkout may still succeed is refused.
    await expect(
      app
        .get(ContractService)
        .requestCancellation(
          { contractId: accepted.id, reason: 'Too slow' },
          transactionCustomer,
        ),
    ).rejects.toThrow('A payment for this contract is in progress');

    // 3. Webhooks: unknown gateway, bad signature, then the signed success.
    const body = { reference, outcome: 'SUCCEEDED' as const };
    await request(server)
      .post('/payments/webhooks/tabby')
      .send(body)
      .expect(404);
    await request(server)
      .post('/payments/webhooks/mock')
      .set(MOCK_SIGNATURE_HEADER, gateway.sign({ ...body, outcome: 'FAILED' }))
      .send(body)
      .expect(401);
    const signed = () =>
      request(server)
        .post('/payments/webhooks/mock')
        .set(MOCK_SIGNATURE_HEADER, gateway.sign(body))
        .send(body)
        .expect(200);
    await signed();
    expect(await contracts.findOneByOrFail({ id: accepted.id })).toMatchObject({
      status: ContractStatus.IN_PROGRESS,
    });
    const paid = await payments.findOneByOrFail({ id: first.paymentId });
    expect(paid).toMatchObject({
      status: PaymentStatus.COMPLETED,
      paymentMethod: PaymentMethod.ELECTRONIC,
      gateway: 'MOCK',
      failedAt: null,
    });
    expect(paid.paidAt).toBeTruthy();

    // 4. A replay changes nothing and posts no second chat event.
    await signed();
    const paidEvents = await dataSource
      .getRepository(Message)
      .createQueryBuilder('message')
      .where('message.kind = :kind', { kind: MessageKind.CONTRACT_PAID })
      .andWhere(`message.metadata->>'paymentId' = :id`, { id: paid.id })
      .getCount();
    expect(paidEvents).toBe(1);
    await expect(
      checkoutService.startCheckout(input, transactionCustomer),
    ).rejects.toThrow();

    // 5. Both parties see the method; only the provider gets the paid notice.
    type GraphqlBody<T> = { data?: T; errors?: Array<{ message: string }> };
    const graphql = async <T>(query: string, principal: JwtPayload) => {
      const token = jwt.sign(principal, process.env.JWT_SECRET!, {
        expiresIn: '5m',
      });
      const response = await request(server)
        .post('/graphql')
        .set({ Authorization: `Bearer ${token}` })
        .send({ query, variables: { id: accepted.id } });
      return response.body as GraphqlBody<T>;
    };
    const details = `query ($id: String!) {
      contract(id: $id) { paymentMethod paymentMethods }
    }`;
    for (const principal of [transactionCustomer, transactionProvider]) {
      const result = await graphql<{
        contract: { paymentMethod: string; paymentMethods: string[] | null };
      }>(details, principal);
      expect(result.errors).toBeUndefined();
      expect(result.data?.contract).toEqual({
        paymentMethod: 'ELECTRONIC',
        paymentMethods: null,
      });
    }
    const notices = `query { myPaidContractNotices { id } }`;
    const before = await graphql<{ myPaidContractNotices: { id: string }[] }>(
      notices,
      transactionProvider,
    );
    expect(before.data?.myPaidContractNotices.map((c) => c.id)).toContain(
      accepted.id,
    );
    const acknowledged = await graphql<{ acknowledgeContractPaid: boolean }>(
      `
        mutation ($id: String!) {
          acknowledgeContractPaid(contractId: $id)
        }
      `,
      transactionProvider,
    );
    expect(acknowledged.data?.acknowledgeContractPaid).toBe(true);
    const after = await graphql<{ myPaidContractNotices: { id: string }[] }>(
      notices,
      transactionProvider,
    );
    expect(after.data?.myPaidContractNotices.map((c) => c.id)).not.toContain(
      accepted.id,
    );

    // 6. A chat fee goes through the same checkout, card only.
    const conversations = dataSource.getRepository(Conversation);
    const conversation = await conversations.findOneByOrFail({
      id: transactionConversationId,
    });
    await conversations.update(conversation.id, {
      feeCycle: conversation.feeCycle + 1,
      customerFeePaidAt: null,
    });
    const fee = await checkoutService.startCheckout(
      {
        purpose: CheckoutPurpose.CHAT_FEE,
        targetId: conversation.id,
        method: PaymentMethod.ELECTRONIC,
      },
      transactionCustomer,
    );
    await request(server)
      .post(new URL(fee.redirectUrl).pathname)
      .type('form')
      .send({ outcome: 'SUCCEEDED' })
      .expect(303);
    expect(
      (await conversations.findOneByOrFail({ id: conversation.id }))
        .customerFeePaidAt,
    ).toBeTruthy();
  });

  it('answers accept and reject with the full contract over GraphQL (H-30)', async () => {
    const contracts = app.get(DataSource).getRepository(Contract);
    const template = await contracts.findOneByOrFail({
      id: transactionContractId,
    });
    const { id: _id, publicId: _number, ...fields } = template;
    void _id;
    void _number;
    const pending = (versionOffset: number) =>
      contracts.save(
        contracts.create({
          ...fields,
          status: ContractStatus.PENDING,
          paidAt: null,
          acceptedAt: null,
          completedAt: null,
          resolvedAt: null,
          supersedesContractId: null,
          version: template.version + versionOffset,
        }),
      );
    const token = jwt.sign(transactionProvider, process.env.JWT_SECRET!, {
      expiresIn: '5m',
    });
    const graphql = async (query: string, input: object) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set({ Authorization: `Bearer ${token}` })
        .send({ query, variables: { input } });
      return response.body as {
        data?: Record<string, Record<string, unknown>>;
        errors?: Array<{ message: string }>;
      };
    };
    const fields_ = `id status provider { id } client { id } signatures { signatureType }`;

    const toAccept = await pending(30);
    const accepted = await graphql(
      `mutation ($input: AcceptContractInput!) { acceptContract(input: $input) { ${fields_} } }`,
      {
        contractId: toAccept.id,
        signatureData: 'provider-signature-h30',
        executionHours: 5,
      },
    );
    expect(accepted.errors).toBeUndefined();
    expect(accepted.data?.acceptContract).toMatchObject({
      id: toAccept.id,
      status: ContractStatus.ACCEPTED,
      provider: { id: transactionProvider.sub },
    });
    expect(accepted.data?.acceptContract.signatures).toContainEqual({
      signatureType: 'PROVIDER_ACCEPTANCE',
    });

    const toReject = await pending(31);
    const rejected = await graphql(
      `mutation ($input: RejectContractInput!) { rejectContract(input: $input) { ${fields_} } }`,
      { contractId: toReject.id, reason: 'Not available this week' },
    );
    expect(rejected.errors).toBeUndefined();
    expect(rejected.data?.rejectContract).toMatchObject({
      id: toReject.id,
      status: ContractStatus.REJECTED,
      provider: { id: transactionProvider.sub },
    });
  });

  it('hides an inactive category and blocks new activity in it (S4-56)', async () => {
    const dataSource = app.get(DataSource);
    const country = await dataSource.getRepository(Country).save({
      nameEn: 'Inactive Country',
      nameAr: 'دولة القسم',
      code: 'IN-E2E',
      dialCode: '+971',
    });
    const city = await dataSource.getRepository(City).save({
      countryId: country.id,
      nameEn: 'Inactive City',
      nameAr: 'مدينة القسم',
    });
    const category = await dataSource.getRepository(Category).save({
      image: 'inactive.png',
      nameEn: 'Seasonal section',
      nameAr: 'قسم موسمي',
      descriptionEn: 'Seasonal section description',
      descriptionAr: 'وصف القسم الموسمي',
    });
    const provider = await dataSource.getRepository(Provider).save({
      name: 'Seasonal Provider',
      commercialName: 'Seasonal Services',
      phone: '+970500000404',
      email: 'seasonal-provider@example.com',
      password: '',
      status: ProviderStatus.ACTIVE,
      cityId: city.id,
      countryId: country.id,
      categories: [category],
    });
    await dataSource.getRepository(SignedContract).save({
      providerId: provider.id,
      status: SignedContractStatus.ACTIVE,
      serviceProviderSignature: 'provider-signature',
      platformManagerName: 'Platform Manager',
      platformManagerSignature: 'manager-signature',
      contractSignedAt: new Date(),
      terminationReason: null,
      deletedAt: null,
    });
    const providerPrincipal = {
      sub: provider.id,
      email: provider.email,
      type: 'provider',
    } as JwtPayload;
    const listingInput = {
      categoryId: category.id,
      cityId: city.id,
      name: 'Seasonal listing',
      description: 'A listing in a section that will be switched off.',
      price: 120,
      type: ListingType.FEATURED,
      story: {
        id: 'seasonal-story',
        filename: 'seasonal.mp4',
        originalFilename: 'seasonal.mp4',
        size: 1,
        type: MediaType.VIDEO,
        sortOrder: 0,
      },
      photos: [],
    };
    const listings = app.get(ListingService);
    const listing = await listings.create(listingInput, provider.id);
    const conversation = await app
      .get(ConversationService)
      .create({ listingId: listing.id }, transactionCustomer);
    const publicIds = async () =>
      (await listings.findAll({ categoryId: category.id })).items.map(
        (item) => item.id,
      );
    expect(await publicIds()).toEqual([listing.id]);

    // Linked providers no longer block deactivation; they are told.
    const categories = app.get(CategoryService);
    await categories.deactivate(category.id);
    const notice = await dataSource.getRepository(Notification).findOne({
      where: { recipientId: provider.id },
      order: { createdAt: 'DESC' },
    });
    expect(notice?.message).toContain('قسم موسمي');

    // Hidden from the public; the owner still sees it.
    expect(await publicIds()).toEqual([]);
    await expect(
      listings.findOne(listing.id, 'en', transactionCustomer.sub),
    ).rejects.toThrow('This section is currently unavailable');
    await expect(
      listings.findOne(listing.id, 'en', undefined, provider.id),
    ).resolves.toMatchObject({ id: listing.id });
    const anonymous = await request(app.getHttpServer()).post('/graphql').send({
      query: `{ categories(input: { status: INACTIVE, limit: 50 }) { items { id } } }`,
    });
    const visible = (
      anonymous.body as {
        data: { categories: { items: Array<{ id: string }> } };
      }
    ).data.categories.items.map((item) => item.id);
    expect(visible).not.toContain(category.id);

    // New ads, chats, contract terms and featuring are refused.
    await expect(listings.create(listingInput, provider.id)).rejects.toThrow(
      'This section is currently unavailable',
    );
    const otherCustomer = await dataSource.getRepository(User).save({
      name: 'Seasonal Customer',
      email: 'seasonal-customer@example.com',
      phone: '+970500000405',
      password: '',
      status: UserStatus.ACTIVE,
      cityId: city.id,
      countryId: country.id,
      address: 'Customer address',
    });
    await expect(
      app.get(ConversationService).create(
        { listingId: listing.id },
        {
          sub: otherCustomer.id,
          email: otherCustomer.email,
          type: 'user',
        },
      ),
    ).rejects.toThrow('This section is currently unavailable');
    await expect(
      app
        .get(ContractService)
        .quote(
          { conversationId: conversation.id, agreedPrice: 100 },
          transactionCustomer,
        ),
    ).rejects.toThrow('This section is currently unavailable');
    await expect(
      app.get(PaymentCheckoutService).startCheckout(
        {
          purpose: CheckoutPurpose.PREMIUM_AD,
          targetId: listing.id,
          method: PaymentMethod.ELECTRONIC,
        },
        providerPrincipal,
      ),
    ).rejects.toThrow('This section is currently unavailable');

    // Reactivated: everything is back.
    await categories.activate(category.id);
    expect(await publicIds()).toEqual([listing.id]);
    await expect(
      listings.findOne(listing.id, 'en', transactionCustomer.sub),
    ).resolves.toMatchObject({ id: listing.id });
  });

  // Last: it runs a badge assignment, which may change other providers.
  it('labels providers no badge run has evaluated as newly added', async () => {
    const dataSource = app.get(DataSource);
    const fresh = await dataSource.getRepository(Provider).save({
      name: 'Fresh Provider',
      commercialName: 'Fresh Services',
      phone: '+966500000909',
      email: 'fresh-provider@example.com',
      password: '',
      status: ProviderStatus.ACTIVE,
    });
    const isNewlyAdded = async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `query Provider($id: ID!) { provider(id: $id) { isNewlyAdded } }`,
          variables: { id: fresh.id },
        });
      const body = response.body as {
        data: { provider: { isNewlyAdded: boolean } } | null;
        errors?: Array<{ message: string }>;
      };
      expect(body.errors).toBeUndefined();
      return body.data!.provider.isNewlyAdded;
    };

    expect(await isNewlyAdded()).toBe(true);
    await app.get(BadgeService).runAssignment('2099-12', 'en');
    expect(await isNewlyAdded()).toBe(false);
  });
});

function subscriptionError(
  client: GraphqlWsClient,
  payload: { query: string; variables?: Record<string, unknown> },
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Subscription timeout')),
      5_000,
    );
    let unsubscribe = (): void => undefined;
    unsubscribe = client.subscribe(payload, {
      next: () => undefined,
      error: (error) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(error);
      },
      complete: () => {
        clearTimeout(timeout);
        resolve(new Error('Subscription completed'));
      },
    });
  });
}

function subscriptionNext(
  client: GraphqlWsClient,
  payload: { query: string; variables: { conversationId: string } },
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Subscription timeout')),
      5_000,
    );
    let unsubscribe = (): void => undefined;
    unsubscribe = client.subscribe(payload, {
      next: (value) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(value);
      },
      error: (error) => {
        clearTimeout(timeout);
        reject(
          error instanceof Error
            ? error
            : new Error(`Subscription failed: ${JSON.stringify(error)}`),
        );
      },
      complete: () => undefined,
    });
  });
}

/** Lets the server register a subscription after the connection is acknowledged. */
function waitForSubscriptionRegistration(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200));
}

/** Resolves with the first pushed value that satisfies `matches`. */
function subscriptionUntil<T>(
  client: GraphqlWsClient,
  payload: { query: string; variables?: Record<string, unknown> },
  matches: (value: T) => boolean,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Subscription timeout')),
      10_000,
    );
    let unsubscribe = (): void => undefined;
    unsubscribe = client.subscribe<T>(payload, {
      next: (value) => {
        if (!value.data || !matches(value.data)) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve(value.data);
      },
      error: (error) => {
        clearTimeout(timeout);
        reject(
          error instanceof Error
            ? error
            : new Error(`Subscription failed: ${JSON.stringify(error)}`),
        );
      },
      complete: () => undefined,
    });
  });
}
