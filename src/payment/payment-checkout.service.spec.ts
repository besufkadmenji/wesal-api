/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { PaymentCheckoutService } from './payment-checkout.service';
import { Payment } from './entities/payment.entity';
import { Contract } from '../contract/entities/contract.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Category } from '../category/entities/category.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { ConversationStatus } from '../conversation/enums/conversation-status.enum';
import { PromotionStatus } from '../listing/enums/listing.enum';
import { CheckoutPurpose } from './enums/checkout-purpose.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentPurpose } from './enums/payment-purpose.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PayerType } from './enums/payer-type.enum';
import { MockPaymentGateway } from './gateway/mock.gateway';

describe('PaymentCheckoutService', () => {
  const paymentRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => ({ ...value })),
    save: jest.fn(async (value) => ({ id: 'payment-id', ...value })),
    update: jest.fn(),
  };
  const contractRepository = { findOne: jest.fn(), count: jest.fn() };
  const conversationRepository = { findOne: jest.fn() };
  const listingRepository = { findOne: jest.fn() };
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
    getRepository: jest.fn(() => paymentRepository),
  };
  const gateway = new MockPaymentGateway();
  const gateways = { forMethod: jest.fn(() => gateway) };
  const after = jest.fn();
  const paymentService = {
    fulfil: jest.fn(async () => ({ fulfilled: true, after })),
  };
  const settingService = { getSetting: jest.fn() };
  const adminNotifications = { notifyAdmins: jest.fn() };
  const service = new PaymentCheckoutService(
    dataSource as never,
    gateways as never,
    paymentService as never,
    settingService as never,
    adminNotifications as never,
  );

  const customer = { sub: 'customer-id', type: 'user' } as never;
  const provider = { sub: 'provider-id', type: 'provider' } as never;
  const acceptedContract = {
    id: 'contract-id',
    publicId: 1300,
    clientId: 'customer-id',
    conversationId: 'conversation-id',
    categoryId: 'category-id',
    status: ContractStatus.ACCEPTED,
    version: 1,
    totalPayable: '1150.00',
    commissionPercent: '2.00',
    commissionAmount: '23.00',
    vatRate: '15.00',
    vatAmount: '150.00',
    depositPercent: '10.00',
    downPayment: '115.00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    paymentRepository.findOne.mockResolvedValue(null);
    contractRepository.findOne.mockResolvedValue(acceptedContract);
    contractRepository.count.mockResolvedValue(0);
    settingService.getSetting.mockResolvedValue({
      tabbyMinAmount: null,
      tabbyMaxAmount: '1000.00',
      tamaraMinAmount: null,
      tamaraMaxAmount: null,
      premiumAdEnabled: true,
      premiumAdFee: '75.00',
      premiumAdDurationDays: 30,
    });
    process.env.WEB_APP_URL = 'https://web.example.test';
  });

  afterAll(() => {
    delete process.env.WEB_APP_URL;
  });

  describe('startCheckout', () => {
    it('opens a pending contract checkout with the chosen method and a fresh reference', async () => {
      const checkout = await service.startCheckout(
        {
          purpose: CheckoutPurpose.CONTRACT,
          targetId: 'contract-id',
          method: PaymentMethod.TAMARA,
        },
        customer,
        'ar',
      );

      const saved = paymentRepository.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        purpose: PaymentPurpose.CONTRACT,
        payerType: PayerType.USER,
        obligationKey: 'CONTRACT:contract-id:USER:customer-id',
        amount: 1150,
        commissionAmount: 23,
        paymentMethod: PaymentMethod.TAMARA,
        status: PaymentStatus.PENDING,
        gateway: 'MOCK',
        configSnapshot: expect.objectContaining({ language: 'ar' }),
      });
      expect(saved.checkoutReference).toMatch(/^[0-9a-f-]{36}$/);
      expect(checkout).toEqual({
        paymentId: 'payment-id',
        redirectUrl: expect.stringContaining(
          `/payments/mock/checkout/${saved.checkoutReference}`,
        ),
      });
    });

    it('rejects an installment method outside the admin bounds', async () => {
      await expect(
        service.startCheckout(
          {
            purpose: CheckoutPurpose.CONTRACT,
            targetId: 'contract-id',
            method: PaymentMethod.TABBY,
          },
          customer,
        ),
      ).rejects.toThrow('not available for this amount');
      expect(paymentRepository.save).not.toHaveBeenCalled();
    });

    it('refuses anyone but the customer, and contracts not awaiting payment', async () => {
      const input = {
        purpose: CheckoutPurpose.CONTRACT,
        targetId: 'contract-id',
        method: PaymentMethod.ELECTRONIC,
      };
      await expect(service.startCheckout(input, provider)).rejects.toThrow(
        'not authorized',
      );
      contractRepository.findOne.mockResolvedValue({
        ...acceptedContract,
        status: ContractStatus.IN_PROGRESS,
      });
      await expect(service.startCheckout(input, customer)).rejects.toThrow(
        'nothing to pay',
      );
      contractRepository.findOne.mockResolvedValue(acceptedContract);
      contractRepository.count.mockResolvedValue(1);
      await expect(service.startCheckout(input, customer)).rejects.toThrow(
        'nothing to pay',
      );
    });

    it('retries a failed attempt on the same row with a new reference', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'payment-id',
        obligationKey: 'CONTRACT:contract-id:USER:customer-id',
        status: PaymentStatus.FAILED,
        checkoutReference: 'old-reference',
        failedAt: new Date(),
        failureReason: 'Declined',
      });
      await service.startCheckout(
        {
          purpose: CheckoutPurpose.CONTRACT,
          targetId: 'contract-id',
          method: PaymentMethod.ELECTRONIC,
        },
        customer,
      );
      const saved = paymentRepository.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        id: 'payment-id',
        status: PaymentStatus.PENDING,
        failedAt: null,
        failureReason: null,
      });
      expect(saved.checkoutReference).not.toBe('old-reference');
    });

    it('refuses to charge an obligation twice', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'payment-id',
        status: PaymentStatus.COMPLETED,
      });
      await expect(
        service.startCheckout(
          {
            purpose: CheckoutPurpose.CONTRACT,
            targetId: 'contract-id',
            method: PaymentMethod.ELECTRONIC,
          },
          customer,
        ),
      ).rejects.toThrow('already been completed');
    });

    it('keeps chat fees on card and charges the current fee cycle', async () => {
      conversationRepository.findOne.mockResolvedValue({
        id: 'conversation-id',
        userId: 'customer-id',
        providerId: 'provider-id',
        listingId: 'listing-id',
        status: ConversationStatus.ACTIVE,
        feeCycle: 2,
        customerFeePaidAt: null,
      });
      listingRepository.findOne.mockResolvedValue({
        categoryId: 'category-id',
      });
      categoryRepository.findOne.mockResolvedValue({
        id: 'category-id',
        customerConversationFeeEnabled: true,
        customerConversationFee: '15.00',
      });
      const input = {
        purpose: CheckoutPurpose.CHAT_FEE,
        targetId: 'conversation-id',
        method: PaymentMethod.TABBY,
      };
      await expect(service.startCheckout(input, customer)).rejects.toThrow(
        'not available',
      );
      await service.startCheckout(
        { ...input, method: PaymentMethod.ELECTRONIC },
        customer,
      );
      expect(paymentRepository.save.mock.calls[0][0]).toMatchObject({
        purpose: PaymentPurpose.CHAT_CUSTOMER,
        obligationKey: 'CHAT_CUSTOMER:conversation-id:2:USER:customer-id',
        amount: 15,
        configSnapshot: expect.objectContaining({ feeCycle: 2 }),
      });
    });

    it('refuses to feature an ad while its category is inactive (S4-56)', async () => {
      listingRepository.findOne.mockResolvedValue({
        id: 'listing-id',
        providerId: 'provider-id',
        categoryId: 'category-id',
        promotionStatus: PromotionStatus.PENDING_PAYMENT,
        promotionCycle: 0,
      });
      categoryRepository.findOne.mockResolvedValueOnce({
        id: 'category-id',
        status: 'INACTIVE',
      });
      await expect(
        service.startCheckout(
          {
            purpose: CheckoutPurpose.PREMIUM_AD,
            targetId: 'listing-id',
            method: PaymentMethod.ELECTRONIC,
          },
          provider,
        ),
      ).rejects.toThrow('This section is currently unavailable');
      expect(paymentRepository.save).not.toHaveBeenCalled();
    });

    it('charges the premium fee only for its owner while payment is pending', async () => {
      listingRepository.findOne.mockResolvedValue({
        id: 'listing-id',
        name: 'Ad',
        providerId: 'provider-id',
        categoryId: 'category-id',
        promotionStatus: PromotionStatus.PENDING_PAYMENT,
        promotionCycle: 0,
      });
      const input = {
        purpose: CheckoutPurpose.PREMIUM_AD,
        targetId: 'listing-id',
        method: PaymentMethod.ELECTRONIC,
      };
      await expect(service.startCheckout(input, customer)).rejects.toThrow(
        'not authorized',
      );
      await service.startCheckout(input, provider);
      expect(paymentRepository.save.mock.calls[0][0]).toMatchObject({
        purpose: PaymentPurpose.PREMIUM_AD,
        payerType: PayerType.PROVIDER,
        obligationKey: 'PREMIUM_AD:listing-id:1:PROVIDER:provider-id',
        amount: 75,
        configSnapshot: expect.objectContaining({
          durationDays: 30,
          promotionCycle: 1,
        }),
      });
    });
  });

  describe('applyGatewayResult', () => {
    const pending = () => ({
      id: 'payment-id',
      purpose: PaymentPurpose.CONTRACT,
      contractId: 'contract-id',
      status: PaymentStatus.PENDING,
      checkoutReference: 'ref-1',
      configSnapshot: { language: 'ar' },
    });

    it('completes the payment and fulfils it, then runs its notifications', async () => {
      paymentRepository.findOne.mockResolvedValue(pending());
      const payment = await service.applyGatewayResult({
        reference: 'ref-1',
        outcome: 'SUCCEEDED',
        raw: { gateway: 'mock' },
      });
      expect(payment).toMatchObject({
        status: PaymentStatus.COMPLETED,
        transactionReference: 'ref-1',
      });
      expect(payment?.paidAt).toBeInstanceOf(Date);
      expect(paymentService.fulfil).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'payment-id' }),
        manager,
        'ar',
      );
      expect(after).toHaveBeenCalled();
    });

    it('records a failure without fulfilling anything', async () => {
      paymentRepository.findOne.mockResolvedValue(pending());
      const payment = await service.applyGatewayResult({
        reference: 'ref-1',
        outcome: 'FAILED',
        failureReason: 'Declined',
        raw: {},
      });
      expect(payment).toMatchObject({
        status: PaymentStatus.FAILED,
        failureReason: 'Declined',
      });
      expect(paymentService.fulfil).not.toHaveBeenCalled();
    });

    it('ignores a replayed result for a decided payment', async () => {
      paymentRepository.findOne.mockResolvedValue({
        ...pending(),
        status: PaymentStatus.COMPLETED,
      });
      await service.applyGatewayResult({
        reference: 'ref-1',
        outcome: 'FAILED',
        raw: {},
      });
      expect(paymentRepository.save).not.toHaveBeenCalled();
      expect(paymentService.fulfil).not.toHaveBeenCalled();
    });

    it('alerts admins about a success nobody can match', async () => {
      paymentRepository.findOne.mockResolvedValue(null);
      await expect(
        service.applyGatewayResult({
          reference: 'stale',
          outcome: 'SUCCEEDED',
          raw: {},
        }),
      ).resolves.toBeNull();
      expect(adminNotifications.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          en: expect.objectContaining({
            title: 'Payment needs a refund review',
          }),
        }),
      );
    });

    it('alerts admins when the target closed before the money arrived', async () => {
      paymentRepository.findOne.mockResolvedValue(pending());
      paymentService.fulfil.mockResolvedValueOnce({
        fulfilled: false,
        after,
      });
      const payment = await service.applyGatewayResult({
        reference: 'ref-1',
        outcome: 'SUCCEEDED',
        raw: {},
      });
      expect(payment?.status).toBe(PaymentStatus.COMPLETED);
      expect(payment?.notes).toContain('refund required');
      expect(after).not.toHaveBeenCalled();
      expect(adminNotifications.notifyAdmins).toHaveBeenCalled();
    });
  });
});
