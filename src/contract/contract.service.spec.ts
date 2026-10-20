/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { ContractService } from './contract.service';
import { Contract } from './entities/contract.entity';
import { ContractSignature } from './entities/contract-signature.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Category } from '../category/entities/category.entity';
import { Provider } from '../provider/entities/provider.entity';
import { DeliveryCompany } from '../delivery-company/entities/delivery-company.entity';
import { ContractStatus } from './enums/contract-status.enum';
import { User } from '../user/entities/user.entity';
import { ContractSettlement } from './entities/contract-settlement.entity';
import { ContractAudit } from './entities/contract-audit.entity';
import { Payment } from '../payment/entities/payment.entity';
import { ContractResolver } from './contract.resolver';
import { Rating } from '../rating/entities/rating.entity';

describe('ContractService', () => {
  const contractQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };
  const contractRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => contractQueryBuilder),
    create: jest.fn((value) => value),
    merge: jest.fn((target: object, ...sources: object[]) =>
      Object.assign(target, ...sources),
    ),
    save: jest.fn(async (value) => value),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const conversationRepository = { findOne: jest.fn(), update: jest.fn() };
  const listingRepository = { findOne: jest.fn() };
  const categoryRepository = { findOne: jest.fn() };
  const providerRepository = { findOne: jest.fn() };
  const userRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const deliveryCompanyRepository = { findOne: jest.fn() };
  const signatureRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'signature-id', ...value })),
  };
  const settlementRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const auditRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const pendingCheckouts = { getCount: jest.fn(async () => 0) };
  const pendingCheckoutQuery = {
    where: jest.fn(() => pendingCheckoutQuery),
    andWhere: jest.fn(() => pendingCheckoutQuery),
    getCount: () => pendingCheckouts.getCount(),
  };
  const paymentRepository = {
    findOne: jest.fn(),
    count: jest.fn(async () => 0),
    delete: jest.fn(async () => ({ affected: 0 })),
    createQueryBuilder: jest.fn(() => pendingCheckoutQuery),
  };
  const ratingRepository = {
    findOne: jest.fn(),
    count: jest.fn(async () => 0),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  // Raw SQL: the contract number pool (empty unless a test fills it) and the
  // unlinking updates of a pre-payment deletion.
  const pooled: number[] = [];
  const query = jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes('DELETE FROM "contract_number_pool"')) {
      pooled.sort((a, b) => a - b);
      const number = pooled.shift();
      return [number === undefined ? [] : [{ number: String(number) }], 0];
    }
    if (sql.includes('INSERT INTO "contract_number_pool"')) {
      pooled.push(...(params?.[0] as number[]));
    }
    return [];
  });
  const manager = {
    query,
    getRepository: jest.fn((entity) => {
      if (entity === Contract) return contractRepository;
      if (entity === Conversation) return conversationRepository;
      if (entity === Listing) return listingRepository;
      if (entity === Category) return categoryRepository;
      if (entity === Provider) return providerRepository;
      if (entity === User) return userRepository;
      if (entity === DeliveryCompany) return deliveryCompanyRepository;
      if (entity === ContractSignature) return signatureRepository;
      if (entity === ContractSettlement) return settlementRepository;
      if (entity === ContractAudit) return auditRepository;
      if (entity === Payment) return paymentRepository;
      if (entity === Rating) return ratingRepository;
      return {};
    }),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (callback) => callback(manager)),
  };
  const settingService = { getSetting: jest.fn() };
  const messageService = {
    persistSystemEvent: jest.fn(async () => ({
      messageAdded: { id: 'message-id' },
      participants: [],
    })),
    publish: jest.fn(),
  };
  const service = new ContractService(
    contractRepository as never,
    conversationRepository as never,
    userRepository as never,
    providerRepository as never,
    dataSource as never,
    settingService as never,
    messageService as never,
  );

  const conversation = {
    id: '5fa17f3e-5eb4-4b87-958a-85859b83656d',
    listingId: '16f43bf8-42a7-424c-8f62-0aa74422669b',
    userId: '24f67fef-b430-474a-8849-a8dca645f3de',
    providerId: '7842b840-fcb2-4ebf-8de4-64af766a1333',
    listing: {
      id: '16f43bf8-42a7-424c-8f62-0aa74422669b',
      categoryId: '31261a67-3386-492c-b065-00601e4692fd',
    },
    provider: {
      id: '7842b840-fcb2-4ebf-8de4-64af766a1333',
      address: 'Provider address',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    contractRepository.findOne.mockReset();
    contractRepository.save.mockImplementation(async (value) => value);
    conversationRepository.findOne.mockResolvedValue(conversation);
    categoryRepository.findOne.mockResolvedValue({
      id: conversation.listing.categoryId,
      depositPercent: 10,
      depositEnabled: true,
      commissionPercent: 2,
      commissionEnabled: true,
      minCommissionAmount: 100,
      minCommissionEnabled: true,
      contractDocumentEnabled: true,
      contractDocumentText: 'Binding terms',
      maxExecutionHours: 30,
      maxExecutionHoursEnabled: true,
      maxTerminationHours: 5,
      maxTerminationHoursEnabled: true,
    });
    settingService.getSetting.mockResolvedValue({
      vatEnabled: true,
      vatRate: 15,
    });
    signatureRepository.findOne.mockResolvedValue(null);
    settlementRepository.findOne.mockResolvedValue(null);
    paymentRepository.findOne.mockResolvedValue({
      id: 'payment-id',
      amount: 575,
      status: 'COMPLETED',
    });
    userRepository.findOne.mockResolvedValue({
      id: conversation.userId,
      contractSignature: 'customer-signature.png',
    });
    contractQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
  });

  it('initializes one idempotent draft for a conversation', async () => {
    const draft = {
      id: 'draft-contract-id',
      publicId: 123,
      conversationId: conversation.id,
      status: ContractStatus.DRAFT,
      version: 1,
    };
    contractRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(draft);
    contractRepository.save.mockResolvedValueOnce(draft);

    const principal = {
      sub: conversation.userId,
      email: 'customer@example.com',
      type: 'user' as const,
    };
    const initialized = await service.initialize(
      { conversationId: conversation.id },
      principal,
    );
    const retried = await service.initialize(
      { conversationId: conversation.id },
      principal,
    );

    expect(initialized).toBe(draft);
    expect(retried).toBe(draft);
    expect(contractRepository.save).toHaveBeenCalledTimes(1);

    expect(conversationRepository.findOne).toHaveBeenCalledTimes(4);
    expect(conversationRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: conversation.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(conversationRepository.findOne).toHaveBeenNthCalledWith(2, {
      where: { id: conversation.id },
      relations: ['listing', 'provider'],
    });
    expect(conversationRepository.findOne).toHaveBeenNthCalledWith(3, {
      where: { id: conversation.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(conversationRepository.findOne).toHaveBeenNthCalledWith(4, {
      where: { id: conversation.id },
      relations: ['listing', 'provider'],
    });
  });

  it('finalizes the initialized draft without changing its ID', async () => {
    const draft = {
      id: 'draft-contract-id',
      publicId: 123,
      conversationId: conversation.id,
      status: ContractStatus.DRAFT,
      version: 1,
    };
    contractRepository.findOne.mockResolvedValueOnce(draft);
    userRepository.findOne.mockResolvedValueOnce({
      id: conversation.userId,
      contractSignature: null,
    });

    const submitted = await service.create(
      {
        contractId: draft.id,
        conversationId: conversation.id,
        agreedPrice: 500,
        customerAddress: 'Customer address',
        signatureData: 'customer-signature.png',
      },
      {
        sub: conversation.userId,
        email: 'customer@example.com',
        type: 'user',
      },
    );

    expect(submitted).toMatchObject({
      id: draft.id,
      publicId: draft.publicId,
      status: ContractStatus.PENDING,
      agreedPrice: 500,
      customerAddress: 'Customer address',
    });
    expect(signatureRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: draft.id,
        signatureData: 'customer-signature.png',
      }),
    );
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: conversation.userId,
        contractSignature: 'customer-signature.png',
      }),
    );
  });

  it('hydrates the conversation listing graph for contract details', async () => {
    const contract = {
      id: 'contract-id',
      clientId: conversation.userId,
      providerId: conversation.providerId,
      status: ContractStatus.PENDING,
      conversation,
    };
    contractRepository.findOne.mockResolvedValueOnce(contract);

    await expect(
      service.findOne(contract.id, {
        sub: conversation.userId,
        email: 'customer@example.com',
        type: 'user',
      }),
    ).resolves.toBe(contract);

    expect(contractRepository.findOne).toHaveBeenCalledWith({
      where: { id: contract.id },
      relations: [
        'conversation',
        'conversation.listing',
        'conversation.listing.category',
        'conversation.listing.provider',
        'client',
        'provider',
        'signatures',
        'supersedesContract',
        'settlements',
        'audits',
        'document',
      ],
    });
  });

  it('hydrates the conversation listing graph for contract lists', async () => {
    await service.findAll(
      {},
      {
        sub: conversation.userId,
        email: 'customer@example.com',
        type: 'user',
      },
    );

    expect(contractQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'contract.conversation',
      'conversation',
    );
    expect(contractQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'conversation.listing',
      'listing',
    );
    expect(contractQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'listing.category',
      'listingCategory',
    );
    expect(contractQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'listing.provider',
      'listingProvider',
    );
    expect(contractQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'contract.settlements',
      'settlements',
    );
    expect(contractQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'contract.audits',
      'audits',
    );
    expect(contractQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'contract.document',
      'document',
    );
  });

  it('leaves relation collections uninitialized for TypeORM hydration', () => {
    const contract = new Contract();

    expect(contract.signatures).toBeUndefined();
    expect(contract.settlements).toBeUndefined();
    expect(contract.audits).toBeUndefined();
  });

  const customer = {
    sub: conversation.userId,
    email: 'customer@example.com',
    type: 'user' as const,
  };

  it('calculates contract terms on the server', async () => {
    // 2% of 10,000 = 200 SAR, above the 100 SAR minimum: commission applies.
    const quote = await service.quote(
      { conversationId: conversation.id, agreedPrice: 10000 },
      customer,
    );

    expect(quote).toMatchObject({
      agreedPrice: 10000,
      depositPercent: 10,
      downPayment: 1000,
      commissionPercent: 2,
      commissionAmount: 200,
      isCharity: false,
      charityAmount: 0,
      vatRate: 15,
      vatAmount: 1500,
      totalPayable: 11500,
      providerNetAmount: 9800,
      contractDocumentText: 'Binding terms',
    });
  });

  it('makes a contract charity when the commission is at or below the minimum', async () => {
    // 2% of 500 = 10 SAR ≤ 100 SAR minimum: still deducted from the
    // provider, but set aside for donation instead of platform revenue.
    await expect(
      service.quote(
        { conversationId: conversation.id, agreedPrice: 500 },
        customer,
      ),
    ).resolves.toMatchObject({
      commissionAmount: 10,
      isCharity: true,
      charityAmount: 10,
      providerNetAmount: 490,
    });
    // Boundary: 2% of 5,000 = 100 SAR equals the minimum, so still charity.
    await expect(
      service.quote(
        { conversationId: conversation.id, agreedPrice: 5000 },
        customer,
      ),
    ).resolves.toMatchObject({ isCharity: true, charityAmount: 100 });
  });

  it('never makes a contract charity without a minimum or a commission', async () => {
    const category = (await categoryRepository.findOne()) as Record<
      string,
      unknown
    >;
    categoryRepository.findOne.mockResolvedValue({
      ...category,
      minCommissionEnabled: false,
    });
    await expect(
      service.quote(
        { conversationId: conversation.id, agreedPrice: 500 },
        customer,
      ),
    ).resolves.toMatchObject({ isCharity: false, commissionAmount: 10 });

    categoryRepository.findOne.mockResolvedValue({
      ...category,
      commissionEnabled: false,
    });
    await expect(
      service.quote(
        { conversationId: conversation.id, agreedPrice: 500 },
        customer,
      ),
    ).resolves.toMatchObject({ isCharity: false, commissionAmount: 0 });
  });

  it('rejects provider delivery time above the snapshot limit', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.PENDING,
      version: 1,
      maxExecutionHours: 10,
    };
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract);

    await expect(
      service.acceptContract(
        {
          contractId: contract.id,
          signatureData: 'signature',
          executionHours: 11,
        },
        {
          sub: conversation.providerId,
          email: 'provider@example.com',
          type: 'provider',
        },
      ),
    ).rejects.toThrow();
    expect(contractRepository.save).not.toHaveBeenCalled();
  });

  it('requires a non-blank contract rejection reason', async () => {
    await expect(
      service.rejectContract(
        { contractId: 'contract-id', reason: '   ' },
        {
          sub: conversation.providerId,
          email: 'provider@example.com',
          type: 'provider',
        },
      ),
    ).rejects.toThrow('rejection reason');
    expect(contractRepository.findOne).not.toHaveBeenCalled();
  });

  it('lets the customer confirm a provider-completed contract', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
      version: 1,
    };
    const hydrated = {
      ...contract,
      status: ContractStatus.COMPLETED,
      signatures: [{ signatureType: 'CUSTOMER_COMPLETION' }],
    };
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(hydrated);

    const completed = await service.completeContract(
      { contractId: contract.id },
      {
        sub: conversation.userId,
        email: 'customer@example.com',
        type: 'user',
      },
    );

    expect(completed).toBe(hydrated);
    expect(signatureRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: contract.id,
        signerId: conversation.userId,
        signatureType: 'CUSTOMER_COMPLETION',
        signatureData: 'customer-signature.png',
      }),
    );
    expect(messageService.persistSystemEvent).toHaveBeenCalledWith(
      conversation.id,
      'CONTRACT_COMPLETED',
      expect.objectContaining({ contractId: contract.id }),
      manager,
    );
  });

  it('records a one-time provider completion and customer deadline', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.IN_PROGRESS,
      version: 1,
      deliveryCompanyId: null,
    };
    const hydrated = {
      ...contract,
      status: ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
      signatures: [{ signatureType: 'PROVIDER_COMPLETION' }],
    };
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(hydrated);
    settingService.getSetting.mockResolvedValue({
      completionConfirmationGraceHours: 24,
    });

    await expect(
      service.providerCompleteContract(
        { contractId: contract.id, signatureData: 'provider-signature.png' },
        {
          sub: conversation.providerId,
          email: 'provider@example.com',
          type: 'provider',
        },
      ),
    ).resolves.toBe(hydrated);

    expect(signatureRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureType: 'PROVIDER_COMPLETION',
        signatureData: 'provider-signature.png',
      }),
    );
    expect(contract.confirmationDeadlineAt).toBeInstanceOf(Date);
    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROVIDER_COMPLETED',
        newStatus: ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
      }),
    );
  });

  it('sets the customer deadline from delivery hours plus grace hours', async () => {
    const now = new Date('2026-10-18T09:00:00Z');
    jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate'] });
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.IN_PROGRESS,
      version: 1,
      deliveryCompanyId: 'delivery-company-id',
    } as Record<string, unknown>;
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract);
    settingService.getSetting.mockResolvedValue({
      completionConfirmationGraceHours: 24,
    });
    const provider = {
      sub: conversation.providerId,
      email: 'provider@example.com',
      type: 'provider' as const,
    };

    try {
      await expect(
        service.providerCompleteContract(
          { contractId: contract.id as string, signatureData: 'sig.png' },
          provider,
        ),
      ).rejects.toThrow('Delivery time in hours is required');

      contractRepository.findOne
        .mockResolvedValueOnce(contract)
        .mockResolvedValueOnce(contract)
        .mockResolvedValueOnce(contract);
      await service.providerCompleteContract(
        {
          contractId: contract.id as string,
          signatureData: 'sig.png',
          deliveryHours: 5,
        },
        provider,
      );
    } finally {
      jest.useRealTimers();
    }

    expect(contract.deliveryHours).toBe(5);
    expect(contract.status).toBe(ContractStatus.DELIVERY_IN_PROGRESS);
    // 5 delivery hours + 24 grace hours, no day conversion.
    expect(contract.confirmationDeadlineAt).toEqual(
      new Date(now.getTime() + 29 * 3_600_000),
    );
  });

  it('balances an early cancellation from the immutable payment snapshot', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.IN_PROGRESS,
      version: 1,
      downPayment: 50,
      commissionAmount: 10,
    };
    const hydrated = { ...contract, status: ContractStatus.CANCELLED };
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(hydrated);

    await expect(
      service.requestCancellation(
        { contractId: contract.id, reason: 'Scope is no longer required' },
        {
          sub: conversation.userId,
          email: 'customer@example.com',
          type: 'user',
        },
      ),
    ).resolves.toBe(hydrated);

    expect(settlementRepository.save).toHaveBeenCalledTimes(3);
    expect(settlementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CUSTOMER_REFUND', amount: 525 }),
    );
    expect(settlementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PROVIDER_RELEASE', amount: 40 }),
    );
    expect(settlementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PLATFORM_COMMISSION', amount: 10 }),
    );
  });

  it('refunds everything and records 0 stars when the provider is overdue', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      listingId: conversation.listingId,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.IN_PROGRESS,
      version: 1,
      downPayment: 50,
      commissionAmount: 10,
      executionHours: 24,
      // Paid 49 h ago: past 24 h of execution plus the 24 h grace.
      paidAt: new Date(Date.now() - 49 * 3_600_000),
    };
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce({ ...contract, status: ContractStatus.CANCELLED });
    ratingRepository.findOne.mockResolvedValue(null);

    await service.requestCancellation(
      { contractId: contract.id, reason: 'The provider never delivered' },
      { sub: conversation.userId, email: 'customer@example.com', type: 'user' },
    );

    expect(settlementRepository.save).toHaveBeenCalledTimes(1);
    expect(settlementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CUSTOMER_REFUND',
        amount: 575,
        idempotencyKey: 'CONTRACT:contract-id:PROVIDER_OVERDUE:CUSTOMER_REFUND',
      }),
    );
    expect(ratingRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-id',
        rating: 0,
        isSystemGenerated: true,
      }),
    );
    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { providerOverdue: true } }),
    );
  });

  it('keeps the deposit split while the provider is within time', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      listingId: conversation.listingId,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.IN_PROGRESS,
      version: 1,
      downPayment: 50,
      commissionAmount: 10,
      executionHours: 24,
      paidAt: new Date(Date.now() - 47 * 3_600_000),
    };
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce({ ...contract, status: ContractStatus.CANCELLED });

    await service.requestCancellation(
      { contractId: contract.id, reason: 'Scope is no longer required' },
      { sub: conversation.userId, email: 'customer@example.com', type: 'user' },
    );

    expect(settlementRepository.save).toHaveBeenCalledTimes(3);
    expect(ratingRepository.save).not.toHaveBeenCalled();
  });

  it('stops the chat timer once a contract is paid', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      clientId: conversation.userId,
      status: ContractStatus.ACCEPTED,
      version: 1,
    };
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract);

    await service.transitionAfterPayment(contract.id, manager as never);

    expect(conversationRepository.update).toHaveBeenCalledWith(
      conversation.id,
      { expiresAt: null },
    );
  });

  describe('admin resolution without the customer signature (Q-C3)', () => {
    const admin = {
      sub: 'admin-id',
      email: 'admin@example.com',
      permissionType: 'SUPER_ADMIN',
    } as never;
    const resolvable = (overrides: object) => ({
      id: 'contract-id',
      conversationId: conversation.id,
      listingId: conversation.listingId,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      version: 1,
      providerNetAmount: 490,
      commissionAmount: 10,
      vatAmount: 75,
      signatures: [],
      ...overrides,
    });

    it.each([
      [
        'an overdue confirmation completed by the admin',
        {
          status: ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
          confirmationDeadlineAt: new Date(Date.now() - 60_000),
        },
        'COMPLETE',
      ],
      [
        'a dispute released to the provider',
        { status: ContractStatus.DISPUTED },
        'RELEASE_PROVIDER',
      ],
    ])(
      'closes %s as ADMIN_RESOLVED, never COMPLETED',
      async (_, state, resolution) => {
        const contract = resolvable(state);
        contractRepository.findOne
          .mockResolvedValueOnce(contract)
          .mockResolvedValueOnce(contract);

        await service.adminResolveContract(
          {
            contractId: contract.id,
            resolution,
            reason: 'Admin decision',
          } as never,
          admin,
        );

        expect(contractRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: ContractStatus.ADMIN_RESOLVED }),
        );
        const saved = contractRepository.save.mock.calls.at(-1)?.[0] as {
          completedAt?: Date;
          resolvedAt?: Date;
        };
        expect(saved.resolvedAt).toBeInstanceOf(Date);
        expect(saved.completedAt).toBeUndefined();
        expect(settlementRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'PROVIDER_RELEASE', amount: 490 }),
        );
        expect(messageService.persistSystemEvent).toHaveBeenCalledWith(
          conversation.id,
          'CONTRACT_ADMIN_RESOLVED',
          expect.objectContaining({ reason: 'Admin decision' }),
          manager,
        );
      },
    );

    it('refuses to complete a contract the customer has not signed', () => {
      expect(() =>
        (
          service as unknown as {
            assertCustomerSigned: (
              contract: object,
              added: object[],
              language: string,
            ) => void;
          }
        ).assertCustomerSigned(
          resolvable({
            signatures: [
              {
                contractId: 'contract-id',
                signatureType: 'PROVIDER_COMPLETION',
              },
            ],
          }),
          [],
          'en',
        ),
      ).toThrow();
    });
  });

  describe('pre-payment cancellation removes the contract (BRD 4.1.18, D-13)', () => {
    const customer = {
      sub: conversation.userId,
      email: 'customer@example.com',
      type: 'user' as const,
    };

    beforeEach(() => {
      pooled.length = 0;
    });

    it('deletes the whole unpaid chain, unlinks it and pools its numbers', async () => {
      const older = {
        id: 'contract-v1',
        publicId: 1300,
        status: ContractStatus.REJECTED,
        supersedesContractId: null,
        paidAt: null,
      };
      const pending = {
        id: 'contract-v2',
        publicId: 1301,
        conversationId: conversation.id,
        providerId: conversation.providerId,
        clientId: conversation.userId,
        status: ContractStatus.PENDING,
        version: 2,
        supersedesContractId: 'contract-v1',
        paidAt: null,
      };
      contractRepository.findOne
        .mockResolvedValueOnce(pending) // lock
        .mockResolvedValueOnce(pending) // latest version
        .mockResolvedValueOnce(older); // chain walk

      const result = await service.requestCancellation(
        { contractId: pending.id, reason: 'Changed my mind' },
        customer,
      );

      expect(result.status).toBe(ContractStatus.CANCELLED);
      const [deleted] = contractRepository.delete.mock.calls[0] as unknown as [
        { id: { _value: string[] } },
      ];
      expect(deleted.id._value).toEqual(['contract-v2', 'contract-v1']);
      expect(pooled.sort()).toEqual([1300, 1301]);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "complaints" SET "contractId" = NULL'),
        [['contract-v2', 'contract-v1']],
      );
      expect(messageService.persistSystemEvent).toHaveBeenCalledWith(
        conversation.id,
        'CONTRACT_CANCELLED',
        { contractNumber: 1301, reason: 'Changed my mind', removed: true },
        manager,
      );
      expect(contractRepository.save).not.toHaveBeenCalled();
      // Abandoned or failed checkouts leave with the chain (S4-10).
      const [abandoned] = paymentRepository.delete.mock.calls[0] as unknown as [
        { contractId: { _value: string[] }; status: { _value: string[] } },
      ];
      expect(abandoned.contractId._value).toEqual([
        'contract-v2',
        'contract-v1',
      ]);
      expect(abandoned.status._value).toEqual(
        expect.arrayContaining(['PENDING', 'FAILED']),
      );
    });

    it('keeps the contract while a recent checkout may still succeed', async () => {
      const accepted = {
        id: 'contract-accepted',
        publicId: 1303,
        conversationId: conversation.id,
        providerId: conversation.providerId,
        clientId: conversation.userId,
        status: ContractStatus.ACCEPTED,
        version: 1,
        supersedesContractId: null,
        paidAt: null,
      };
      contractRepository.findOne
        .mockResolvedValueOnce(accepted)
        .mockResolvedValueOnce(accepted);
      pendingCheckouts.getCount.mockResolvedValueOnce(1);

      await expect(
        service.requestCancellation(
          { contractId: accepted.id, reason: 'Too slow' },
          customer,
        ),
      ).rejects.toThrow('A payment for this contract is in progress');
      expect(contractRepository.delete).not.toHaveBeenCalled();
    });

    it('gives the next new contract the smallest released number', async () => {
      pooled.push(1301, 1256);
      const number = await (
        service as unknown as {
          reusedNumber: (m: unknown) => Promise<{ publicId?: number }>;
        }
      ).reusedNumber(manager);
      expect(number).toEqual({ publicId: 1256 });
      expect(pooled).toEqual([1301]);

      pooled.length = 0;
      await expect(
        (
          service as unknown as {
            reusedNumber: (m: unknown) => Promise<{ publicId?: number }>;
          }
        ).reusedNumber(manager),
      ).resolves.toEqual({});
    });

    it('never deletes a paid contract', async () => {
      const paid = {
        id: 'contract-paid',
        publicId: 1302,
        conversationId: conversation.id,
        providerId: conversation.providerId,
        clientId: conversation.userId,
        status: ContractStatus.IN_PROGRESS,
        version: 1,
        downPayment: 50,
        commissionAmount: 10,
        paidAt: new Date(),
        executionHours: 72,
      };
      contractRepository.findOne
        .mockResolvedValueOnce(paid)
        .mockResolvedValueOnce(paid)
        .mockResolvedValueOnce({ ...paid, status: ContractStatus.CANCELLED });

      await service.requestCancellation(
        { contractId: paid.id, reason: 'No longer needed' },
        customer,
      );

      expect(contractRepository.delete).not.toHaveBeenCalled();
      expect(contractRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ContractStatus.CANCELLED }),
      );
    });
  });

  it('resends a rejected contract as an immutable new version', async () => {
    const rejected = {
      id: 'rejected-contract-id',
      conversationId: conversation.id,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.REJECTED,
      version: 1,
    };
    contractRepository.findOne
      .mockResolvedValueOnce(rejected)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(rejected);
    contractRepository.save.mockImplementation(async (value) => ({
      id: 'resent-contract-id',
      ...value,
    }));

    const resent = await service.resendContract(
      {
        rejectedContractId: rejected.id,
        agreedPrice: 600,
        customerAddress: 'Customer address',
      },
      {
        sub: conversation.userId,
        email: 'customer@example.com',
        type: 'user',
      },
    );

    expect(resent).toMatchObject({
      id: 'resent-contract-id',
      version: 2,
      supersedesContractId: rejected.id,
      status: ContractStatus.PENDING,
    });
    expect(rejected.status).toBe(ContractStatus.REJECTED);
    expect(signatureRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'resent-contract-id',
        signatureData: 'customer-signature.png',
      }),
    );
  });
});

describe('ContractResolver non-null relation fields', () => {
  const resolver = new ContractResolver({} as never);
  const contract = { id: 'contract-id' } as Contract;

  it('returns empty arrays when contract relations were not hydrated', () => {
    expect(resolver.signatures(contract)).toEqual([]);
    expect(resolver.settlements(contract)).toEqual([]);
    expect(resolver.audits(contract)).toEqual([]);
  });
});
