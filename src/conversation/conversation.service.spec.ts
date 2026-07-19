/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { ConversationService } from './conversation.service';
import { ConversationStatus } from './enums/conversation-status.enum';

describe('ConversationService', () => {
  const conversationRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const listingRepository = { findOne: jest.fn() };
  const providerRepository = { findOne: jest.fn() };
  const categoryRepository = { findOne: jest.fn() };
  const messageRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const settingService = { getSetting: jest.fn() };

  const service = new ConversationService(
    conversationRepository as never,
    listingRepository as never,
    providerRepository as never,
    categoryRepository as never,
    messageRepository as never,
    settingService as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('closes an expired conversation lazily and makes it read-only', async () => {
    const expired = {
      id: '5fa17f3e-5eb4-4b87-958a-85859b83656d',
      listingId: '16f43bf8-42a7-424c-8f62-0aa74422669b',
      userId: '24f67fef-b430-474a-8849-a8dca645f3de',
      providerId: '7842b840-fcb2-4ebf-8de4-64af766a1333',
      status: ConversationStatus.ACTIVE,
      expiresAt: new Date(Date.now() - 1_000),
      feeCycle: 1,
    };
    conversationRepository.findOne.mockResolvedValue(expired);

    const result = await service.findOne(expired.id, {
      sub: expired.userId,
      email: 'user@example.com',
      type: 'user',
    });

    expect(result).toMatchObject({
      status: ConversationStatus.CLOSED,
      closeReason: 'EXPIRED',
    });
    expect(result.closedAt).toBeInstanceOf(Date);
    expect(conversationRepository.save).toHaveBeenCalledWith(expired);
  });

  it('restarts an expired conversation with a fresh fee cycle', async () => {
    const expired = {
      id: '5fa17f3e-5eb4-4b87-958a-85859b83656d',
      listingId: '16f43bf8-42a7-424c-8f62-0aa74422669b',
      userId: '24f67fef-b430-474a-8849-a8dca645f3de',
      providerId: '7842b840-fcb2-4ebf-8de4-64af766a1333',
      status: ConversationStatus.CLOSED,
      closeReason: 'EXPIRED',
      feeCycle: 2,
      customerFeePaidAt: new Date(),
      providerFeePaidAt: new Date(),
    };
    conversationRepository.findOne.mockResolvedValue(expired);
    settingService.getSetting.mockResolvedValue({
      contractAcceptanceWindowEnabled: true,
      contractAcceptanceWindowDays: 3,
    });

    const result = await service.restart(expired.id, {
      sub: expired.userId,
      email: 'user@example.com',
      type: 'user',
    });

    expect(result).toMatchObject({
      status: ConversationStatus.ACTIVE,
      closeReason: null,
      feeCycle: 3,
      customerFeePaidAt: null,
      providerFeePaidAt: null,
    });
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('returns the existing conversation when create is retried', async () => {
    const existing = {
      id: '5fa17f3e-5eb4-4b87-958a-85859b83656d',
      listingId: '16f43bf8-42a7-424c-8f62-0aa74422669b',
      userId: '24f67fef-b430-474a-8849-a8dca645f3de',
      providerId: '7842b840-fcb2-4ebf-8de4-64af766a1333',
    };
    listingRepository.findOne.mockResolvedValue({
      id: existing.listingId,
      providerId: existing.providerId,
    });
    providerRepository.findOne.mockResolvedValue({ id: existing.providerId });
    conversationRepository.findOne.mockResolvedValue(existing);

    await expect(
      service.create(
        { listingId: existing.listingId },
        { sub: existing.userId, email: 'user@example.com', type: 'user' },
      ),
    ).resolves.toBe(existing);
    expect(conversationRepository.save).not.toHaveBeenCalled();
  });

  it('applies independent customer and provider fee access', async () => {
    const conversation = {
      id: '5fa17f3e-5eb4-4b87-958a-85859b83656d',
      listingId: '16f43bf8-42a7-424c-8f62-0aa74422669b',
      userId: '24f67fef-b430-474a-8849-a8dca645f3de',
      providerId: '7842b840-fcb2-4ebf-8de4-64af766a1333',
      status: ConversationStatus.ACTIVE,
      customerFeePaidAt: new Date(),
      providerFeePaidAt: null,
    };
    listingRepository.findOne.mockResolvedValue({
      id: conversation.listingId,
      categoryId: '31261a67-3386-492c-b065-00601e4692fd',
    });
    categoryRepository.findOne.mockResolvedValue({
      customerConversationFeeEnabled: true,
      customerConversationFee: 10,
      providerConversationFeeEnabled: true,
      providerConversationFee: 20,
    });

    const customer = await service.getAccess(conversation as never, {
      sub: conversation.userId,
      email: 'user@example.com',
      type: 'user',
    });
    const provider = await service.getAccess(conversation as never, {
      sub: conversation.providerId,
      email: 'provider@example.com',
      type: 'provider',
    });

    expect(customer).toMatchObject({ feeAmount: 10, canSend: true });
    expect(provider).toMatchObject({ feeAmount: 20, canSend: false });
  });

  it('waives a disabled conversation fee', async () => {
    const conversation = {
      id: '5fa17f3e-5eb4-4b87-958a-85859b83656d',
      listingId: '16f43bf8-42a7-424c-8f62-0aa74422669b',
      userId: '24f67fef-b430-474a-8849-a8dca645f3de',
      providerId: '7842b840-fcb2-4ebf-8de4-64af766a1333',
      status: ConversationStatus.ACTIVE,
      customerFeePaidAt: null,
      providerFeePaidAt: null,
    };
    listingRepository.findOne.mockResolvedValue({
      categoryId: '31261a67-3386-492c-b065-00601e4692fd',
    });
    categoryRepository.findOne.mockResolvedValue({
      customerConversationFeeEnabled: false,
      customerConversationFee: 10,
    });

    await expect(
      service.getAccess(conversation as never, {
        sub: conversation.userId,
        email: 'user@example.com',
        type: 'user',
      }),
    ).resolves.toMatchObject({ feeRequired: false, canSend: true });
  });
});
