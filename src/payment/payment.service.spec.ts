/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { Contract } from '../contract/entities/contract.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Category } from '../category/entities/category.entity';
import { Provider } from '../provider/entities/provider.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { ConversationStatus } from '../conversation/enums/conversation-status.enum';
import { PaymentPurpose } from './enums/payment-purpose.enum';
import { PayerType } from './enums/payer-type.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import {
  ListingStatus,
  ListingType,
  PromotionStatus,
} from '../listing/enums/listing.enum';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { SignedContractStatus } from '../provider/enums/contract.enum';

describe('PaymentService', () => {
  const paymentRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'payment-id', ...value })),
  };
  const contractRepository = { findOne: jest.fn() };
  const conversationRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const listingRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const categoryRepository = { findOne: jest.fn() };
  const providerRepository = { findOne: jest.fn() };
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity === Payment) return paymentRepository;
      if (entity === Contract) return contractRepository;
      if (entity === Conversation) return conversationRepository;
      if (entity === Listing) return listingRepository;
      if (entity === Category) return categoryRepository;
      if (entity === Provider) return providerRepository;
      return {};
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (callback) => callback(manager)),
  };
  const contractService = {
    transitionAfterPayment: jest.fn(async (id) => ({
      id,
      status: ContractStatus.IN_PROGRESS,
    })),
    findOne: jest.fn(async (id) => ({
      id,
      status: ContractStatus.IN_PROGRESS,
      signatures: [],
    })),
  };
  const messageService = {
    persistSystemEvent: jest.fn(async () => ({
      messageAdded: { id: 'message-id' },
      participants: [],
    })),
    publish: jest.fn(),
  };
  const settingService = { getSetting: jest.fn() };
  const service = new PaymentService(
    paymentRepository as never,
    { findOne: jest.fn() } as never,
    { findOne: jest.fn() } as never,
    dataSource as never,
    contractService as never,
    messageService as never,
    settingService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    providerRepository.findOne.mockResolvedValue({
      id: 'provider-id',
      status: ProviderStatus.ACTIVE,
      signedContract: { status: SignedContractStatus.ACTIVE },
    });
  });

  it('settles the agreed price and keeps fee values as snapshots', async () => {
    const contract = {
      id: 'contract-id',
      conversationId: 'conversation-id',
      categoryId: 'category-id',
      clientId: 'customer-id',
      status: ContractStatus.ACCEPTED,
      version: 1,
      agreedPrice: 500,
      depositPercent: 10,
      downPayment: 50,
      commissionPercent: 2,
      commissionAmount: 10,
      vatRate: 15,
      vatAmount: 1.5,
      totalPayable: 575,
    };
    contractRepository.findOne.mockResolvedValue(contract);
    paymentRepository.findOne.mockResolvedValue(null);

    const result = await service.settleContractPayment(contract.id, {
      sub: contract.clientId,
      email: 'customer@example.com',
      type: 'user',
    });

    expect(result.payment).toMatchObject({
      purpose: PaymentPurpose.CONTRACT,
      payerType: PayerType.USER,
      amount: 575,
      commissionAmount: 10,
      vatAmount: 1.5,
    });
    expect(contractService.transitionAfterPayment).toHaveBeenCalled();
    expect(contractService.findOne).toHaveBeenCalledWith(
      contract.id,
      expect.objectContaining({ sub: contract.clientId }),
      'en',
    );
    expect(result.contract.signatures).toEqual([]);
  });

  it('returns an existing contract obligation without inserting a duplicate', async () => {
    const contract = {
      id: 'contract-id',
      clientId: 'customer-id',
      status: ContractStatus.IN_PROGRESS,
    };
    const existing = {
      id: 'existing-payment',
      amount: 500,
      status: PaymentStatus.COMPLETED,
    };
    contractRepository.findOne.mockResolvedValue(contract);
    paymentRepository.findOne.mockResolvedValue(existing);

    const result = await service.settleContractPayment(contract.id, {
      sub: contract.clientId,
      email: 'customer@example.com',
      type: 'user',
    });

    expect(result.payment).toBe(existing);
    expect(paymentRepository.save).not.toHaveBeenCalled();
    expect(contractService.transitionAfterPayment).not.toHaveBeenCalled();
    expect(contractService.findOne).toHaveBeenCalledWith(
      contract.id,
      expect.objectContaining({ sub: contract.clientId }),
      'en',
    );
    expect(result.contract.signatures).toEqual([]);
  });

  it('unlocks only the provider side after provider chat-fee payment', async () => {
    const conversation = {
      id: 'conversation-id',
      listingId: 'listing-id',
      userId: 'customer-id',
      providerId: 'provider-id',
      customerFeePaidAt: null,
      providerFeePaidAt: null,
      status: ConversationStatus.ACTIVE,
    };
    conversationRepository.findOne.mockResolvedValue(conversation);
    listingRepository.findOne.mockResolvedValue({
      id: 'listing-id',
      categoryId: 'category-id',
    });
    categoryRepository.findOne.mockResolvedValue({
      id: 'category-id',
      customerConversationFeeEnabled: true,
      customerConversationFee: 10,
      providerConversationFeeEnabled: true,
      providerConversationFee: 20,
    });
    paymentRepository.findOne.mockResolvedValue(null);

    const result = await service.settleConversationFee(conversation.id, {
      sub: conversation.providerId,
      email: 'provider@example.com',
      type: 'provider',
    });

    expect(result.payment).toMatchObject({
      purpose: PaymentPurpose.CHAT_PROVIDER,
      amount: 20,
    });
    expect(result.conversation.providerFeePaidAt).toBeInstanceOf(Date);
    expect(result.conversation.customerFeePaidAt).toBeNull();
    expect(result.access.canSend).toBe(true);
  });

  describe('fulfil (gateway-confirmed payments, S4-10)', () => {
    const paid = (overrides: Partial<Payment>) =>
      ({
        id: 'payment-id',
        payerId: 'payer-id',
        amount: 100,
        status: PaymentStatus.COMPLETED,
        ...overrides,
      }) as Payment;

    it('starts an accepted contract and posts the paid event', async () => {
      contractRepository.findOne.mockResolvedValue({
        id: 'contract-id',
        conversationId: 'conversation-id',
        status: ContractStatus.ACCEPTED,
      });
      const result = await service.fulfil(
        paid({ purpose: PaymentPurpose.CONTRACT, contractId: 'contract-id' }),
        manager as never,
      );
      expect(result.fulfilled).toBe(true);
      expect(contractService.transitionAfterPayment).toHaveBeenCalledWith(
        'contract-id',
        manager,
        'en',
      );
      expect(messageService.persistSystemEvent).toHaveBeenCalledWith(
        'conversation-id',
        'CONTRACT_PAID',
        expect.objectContaining({ paymentId: 'payment-id', amount: 100 }),
        manager,
      );
      await result.after();
      expect(messageService.publish).toHaveBeenCalled();
    });

    it('leaves a contract that is no longer awaiting payment untouched', async () => {
      contractRepository.findOne.mockResolvedValue({
        id: 'contract-id',
        status: ContractStatus.CANCELLED,
      });
      const result = await service.fulfil(
        paid({ purpose: PaymentPurpose.CONTRACT, contractId: 'contract-id' }),
        manager as never,
      );
      expect(result.fulfilled).toBe(false);
      expect(contractService.transitionAfterPayment).not.toHaveBeenCalled();
    });

    it('unlocks the payer side of the chat for the paid fee cycle', async () => {
      conversationRepository.findOne.mockResolvedValue({
        id: 'conversation-id',
        status: ConversationStatus.ACTIVE,
        feeCycle: 2,
        customerFeePaidAt: null,
        providerFeePaidAt: null,
      });
      const result = await service.fulfil(
        paid({
          purpose: PaymentPurpose.CHAT_PROVIDER,
          payerType: PayerType.PROVIDER,
          conversationId: 'conversation-id',
          configSnapshot: { feeCycle: 2 },
        }),
        manager as never,
      );
      expect(result.fulfilled).toBe(true);
      const saved = conversationRepository.save.mock.calls[0][0];
      expect(saved.providerFeePaidAt).toBeInstanceOf(Date);
      expect(saved.customerFeePaidAt).toBeNull();
    });

    it('ignores a chat fee paid for an older cycle', async () => {
      conversationRepository.findOne.mockResolvedValue({
        id: 'conversation-id',
        status: ConversationStatus.ACTIVE,
        feeCycle: 3,
        customerFeePaidAt: null,
      });
      const result = await service.fulfil(
        paid({
          purpose: PaymentPurpose.CHAT_CUSTOMER,
          payerType: PayerType.USER,
          conversationId: 'conversation-id',
          configSnapshot: { feeCycle: 2 },
        }),
        manager as never,
      );
      expect(result.fulfilled).toBe(false);
      expect(conversationRepository.save).not.toHaveBeenCalled();
    });

    it('features a listing only once its premium fee is paid', async () => {
      listingRepository.findOne.mockResolvedValue({
        id: 'listing-id',
        providerId: 'provider-id',
        type: ListingType.FREE,
        status: ListingStatus.ACTIVE,
        promotionStatus: PromotionStatus.PENDING_PAYMENT,
        promotionCycle: 0,
      });
      const result = await service.fulfil(
        paid({
          purpose: PaymentPurpose.PREMIUM_AD,
          listingId: 'listing-id',
          configSnapshot: { durationDays: 30, promotionCycle: 1 },
        }),
        manager as never,
      );
      expect(result.fulfilled).toBe(true);
      const saved = listingRepository.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        type: ListingType.FEATURED,
        promotionStatus: PromotionStatus.ACTIVE,
        promotionCycle: 1,
      });
      expect(
        saved.featuredEndsAt.getTime() - saved.featuredStartsAt.getTime(),
      ).toBe(30 * 86_400_000);
    });

    it('does not feature a listing that is no longer waiting for payment', async () => {
      listingRepository.findOne.mockResolvedValue({
        id: 'listing-id',
        promotionStatus: PromotionStatus.ACTIVE,
        promotionCycle: 1,
      });
      const result = await service.fulfil(
        paid({
          purpose: PaymentPurpose.PREMIUM_AD,
          listingId: 'listing-id',
          configSnapshot: { durationDays: 30, promotionCycle: 1 },
        }),
        manager as never,
      );
      expect(result.fulfilled).toBe(false);
      expect(listingRepository.save).not.toHaveBeenCalled();
    });
  });

  it('refuses the instant shortcuts once a real gateway is configured', async () => {
    process.env.PAYMENT_GATEWAY = 'moyasar';
    try {
      await expect(
        service.settleContractPayment('contract-id', {
          sub: 'user-id',
          type: 'user',
        } as never),
      ).rejects.toThrow('Instant payment is only available');
      await expect(
        service.settleConversationFee('conversation-id', {
          sub: 'user-id',
          type: 'user',
        } as never),
      ).rejects.toThrow('Instant payment is only available');
    } finally {
      delete process.env.PAYMENT_GATEWAY;
    }
  });
});
