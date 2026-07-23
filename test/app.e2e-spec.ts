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
import { City } from '../src/city/entities/city.entity';
import { ContractService } from '../src/contract/contract.service';
import { ContractStatus } from '../src/contract/enums/contract-status.enum';
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
import { Provider } from '../src/provider/entities/provider.entity';
import { ProviderStatus } from '../src/provider/enums/provider-status.enum';
import { SignedContractStatus } from '../src/provider/enums/contract.enum';
import { SettingService } from '../src/setting/setting.service';
import { SignedContract } from '../src/signed-contract/signed-contract.entity';
import { User } from '../src/user/entities/user.entity';
import { UserStatus } from '../src/user/enums/user-status.enum';
import type { JwtPayload } from '../src/auth/strategies/jwt.strategy';

jest.setTimeout(120_000);

describe('Sprint 3 API boundaries (e2e)', () => {
  let app: INestApplication<App>;
  let appUrl: string;
  let container: StartedPostgreSqlContainer;
  let transactionConversationId: string;
  let transactionCustomer: JwtPayload;
  let transactionProvider: JwtPayload;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.AUTO_SEED = 'false';
    process.env.ELASTIC_ENABLED = 'false';
    process.env.JWT_SECRET = 'sprint-3-e2e-secret';

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
      minCommissionAmount: 100,
      depositEnabled: true,
      depositPercent: 10,
      maxCompletionDaysEnabled: true,
      maxCompletionDays: 30,
      maxTerminationDaysEnabled: true,
      maxTerminationDays: 5,
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
        filename: 'story.png',
        originalFilename: 'story.png',
        size: 1,
        type: MediaType.IMAGE,
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
        deliveryTimeDays: 7,
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

  it('publishes featured listings as paid at create, records mock payment, and downgrades on expiry', async () => {
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
    const listing = await app.get(ListingService).create(
      {
        categoryId: category.id,
        cityId: city.id,
        name: 'Featured premium listing',
        description: 'This premium listing is published after mock payment at create.',
        price: 250,
        type: ListingType.FEATURED,
        story: {
          id: 'premium-story',
          filename: 'premium.png',
          originalFilename: 'premium.png',
          size: 1,
          type: MediaType.IMAGE,
          sortOrder: 0,
        },
        photos: [],
      },
      provider.id,
    );
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
      await dataSource.getRepository(Payment).count({
        where: { listingId: listing.id, purpose: PaymentPurpose.PREMIUM_AD },
      }),
    ).toBe(1);

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
});

function subscriptionError(
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
