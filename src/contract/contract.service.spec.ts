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
  };
  const conversationRepository = { findOne: jest.fn() };
  const listingRepository = { findOne: jest.fn() };
  const categoryRepository = { findOne: jest.fn() };
  const providerRepository = { findOne: jest.fn() };
  const deliveryCompanyRepository = { findOne: jest.fn() };
  const signatureRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'signature-id', ...value })),
  };
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity === Contract) return contractRepository;
      if (entity === Conversation) return conversationRepository;
      if (entity === Listing) return listingRepository;
      if (entity === Category) return categoryRepository;
      if (entity === Provider) return providerRepository;
      if (entity === DeliveryCompany) return deliveryCompanyRepository;
      if (entity === ContractSignature) return signatureRepository;
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
    {} as never,
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
      maxCompletionDays: 30,
      maxCompletionDaysEnabled: true,
      maxTerminationDays: 5,
      maxTerminationDaysEnabled: true,
    });
    settingService.getSetting.mockResolvedValue({
      vatEnabled: true,
      vatRate: 15,
    });
    signatureRepository.findOne.mockResolvedValue(null);
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
      expect.objectContaining({ contractId: draft.id }),
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
  });

  it('calculates contract terms on the server', async () => {
    const quote = await service.quote(
      { conversationId: conversation.id, agreedPrice: 500 },
      {
        sub: conversation.userId,
        email: 'customer@example.com',
        type: 'user',
      },
    );

    expect(quote).toMatchObject({
      agreedPrice: 500,
      depositPercent: 10,
      downPayment: 50,
      commissionPercent: 2,
      commissionAmount: 10,
      vatRate: 15,
      vatAmount: 75,
      totalPayable: 575,
      providerNetAmount: 490,
      contractDocumentText: 'Binding terms',
    });
  });

  it('rejects provider delivery time above the snapshot limit', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.PENDING,
      version: 1,
      maxCompletionDays: 10,
    };
    contractRepository.findOne
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce(contract);

    await expect(
      service.acceptContract(
        {
          contractId: contract.id,
          signatureData: 'signature',
          deliveryTimeDays: 11,
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

  it('lets the customer sign and complete an in-progress contract', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: conversation.id,
      providerId: conversation.providerId,
      clientId: conversation.userId,
      status: ContractStatus.IN_PROGRESS,
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
      { contractId: contract.id, signatureData: 'completion-signature.png' },
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
        signatureData: 'completion-signature.png',
      }),
    );
    expect(messageService.persistSystemEvent).toHaveBeenCalledWith(
      conversation.id,
      'CONTRACT_COMPLETED',
      expect.objectContaining({ contractId: contract.id }),
      manager,
    );
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
        signatureData: 'new-signature',
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
  });
});
