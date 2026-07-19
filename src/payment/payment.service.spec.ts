/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { Contract } from '../contract/entities/contract.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Category } from '../category/entities/category.entity';
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
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity === Payment) return paymentRepository;
      if (entity === Contract) return contractRepository;
      if (entity === Conversation) return conversationRepository;
      if (entity === Listing) return listingRepository;
      if (entity === Category) return categoryRepository;
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
  };
  const messageService = {
    persistSystemEvent: jest.fn(async () => ({
      messageAdded: { id: 'message-id' },
      participants: [],
    })),
    publish: jest.fn(),
  };
  const settingService = { getSetting: jest.fn() };
  const searchService = { indexListing: jest.fn(async () => undefined) };
  const service = new PaymentService(
    paymentRepository as never,
    { findOne: jest.fn() } as never,
    { findOne: jest.fn() } as never,
    dataSource as never,
    contractService as never,
    messageService as never,
    settingService as never,
    searchService as never,
  );

  beforeEach(() => jest.clearAllMocks());

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

  it('activates a premium listing atomically and reuses the cycle payment', async () => {
    const listing = {
      id: 'listing-id',
      providerId: 'provider-id',
      categoryId: 'category-id',
      type: ListingType.FEATURED,
      status: ListingStatus.PENDING_PAYMENT,
      promotionStatus: PromotionStatus.PENDING_PAYMENT,
      promotionCycle: 1,
      featuredStartsAt: null,
      featuredEndsAt: null,
    };
    listingRepository.findOne.mockResolvedValue(listing);
    settingService.getSetting.mockResolvedValue({
      premiumAdEnabled: true,
      premiumAdFee: 75,
      premiumAdDurationDays: 30,
    });
    paymentRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'payment-id',
        status: PaymentStatus.COMPLETED,
      });

    const principal = {
      sub: listing.providerId,
      email: 'provider@example.com',
      type: 'provider' as const,
    };
    const first = await service.settlePremiumAd(listing.id, principal);
    const retry = await service.settlePremiumAd(listing.id, principal);

    expect(first.payment).toMatchObject({
      purpose: PaymentPurpose.PREMIUM_AD,
      amount: 75,
      configSnapshot: { durationDays: 30, promotionCycle: 1 },
    });
    expect(first.listing).toMatchObject({
      status: ListingStatus.ACTIVE,
      promotionStatus: PromotionStatus.ACTIVE,
    });
    expect(retry.payment).toMatchObject({ id: 'payment-id' });
    expect(paymentRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects premium payment from a non-owner provider', async () => {
    listingRepository.findOne.mockResolvedValue({
      id: 'listing-id',
      providerId: 'owner-id',
      promotionStatus: PromotionStatus.PENDING_PAYMENT,
      promotionCycle: 1,
    });
    settingService.getSetting.mockResolvedValue({
      premiumAdEnabled: true,
      premiumAdFee: 75,
      premiumAdDurationDays: 30,
    });

    await expect(
      service.settlePremiumAd('listing-id', {
        sub: 'different-provider',
        email: 'provider@example.com',
        type: 'provider',
      }),
    ).rejects.toThrow();
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });
});
