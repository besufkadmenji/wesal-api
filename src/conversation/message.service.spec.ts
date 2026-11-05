/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { MessageService } from './message.service';
import { Message } from './entities/message.entity';
import { ConversationStatus } from './enums/conversation-status.enum';
import { MessageKind } from './enums/message-kind.enum';
import { ConversationSenderType } from './enums/sender-type.enum';

/** ClickUp 869fnwhm3: chat photos (BRD "send text messages and photos"). */
describe('MessageService.create with photos', () => {
  const conversation = {
    id: 'c1',
    userId: 'u1',
    providerId: 'p1',
    status: ConversationStatus.ACTIVE,
  };
  const saved: Partial<Message>[] = [];
  const messageRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => {
      saved.push(value);
      return { id: 'm1', createdAt: new Date(), ...value };
    }),
  };
  const manager = {
    getRepository: jest.fn((entity) =>
      entity === Message ? messageRepo : { update: jest.fn() },
    ),
  };
  const messageRepository = {
    manager: { transaction: jest.fn(async (cb) => cb(manager)) },
    findOne: jest.fn(async () => ({ id: 'm1', ...saved.at(-1) })),
  };
  const conversationRepository = { findOne: jest.fn(async () => conversation) };
  const conversationService = {
    getAccess: jest.fn(async () => ({ canSend: true })),
  };
  const pubSub = { publish: jest.fn() };
  const userRepository = {
    findOne: jest.fn(async () => ({ id: 'u1', name: 'Sara' })),
  };
  const providerRepository = {
    findOne: jest.fn(async () => ({
      id: 'p1',
      name: 'Omar',
      commercialName: 'Omar Plumbing',
    })),
  };
  const pushService = { sendForChatMessage: jest.fn(async () => undefined) };
  const service = new MessageService(
    messageRepository as never,
    conversationRepository as never,
    userRepository as never,
    providerRepository as never,
    pubSub as never,
    conversationService as never,
    pushService as never,
  );
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const customer = { sub: 'u1', type: 'user' } as never;
  const photo = {
    filename: '0b6f3c1e-1111-4222-8333-944455556666.jpg',
    originalFilename: 'kitchen.jpg',
    size: 2048,
  };

  beforeEach(() => {
    saved.length = 0;
    jest.clearAllMocks();
  });

  it('sends a photo with no text', async () => {
    await service.create(
      { conversationId: 'c1', content: '', attachment: photo },
      customer,
    );
    expect(saved[0]).toMatchObject({
      kind: MessageKind.TEXT,
      content: '',
      metadata: { attachment: photo },
    });
    expect(pubSub.publish).toHaveBeenCalled();
  });

  it('keeps the caption and still hides contact details in it', async () => {
    await service.create(
      {
        conversationId: 'c1',
        content: 'Call me on +966 50 123 4567',
        attachment: photo,
      },
      customer,
    );
    expect(saved[0].content).toBe('Call me on [contact hidden]');
    expect(saved[0].metadata).toEqual({ attachment: photo });
  });

  it('refuses a message with neither text nor photo', async () => {
    await expect(
      service.create({ conversationId: 'c1', content: '   ' }, customer),
    ).rejects.toThrow('cannot be empty');
    expect(messageRepo.save).not.toHaveBeenCalled();
  });

  describe('push to the other participant', () => {
    it("pushes a customer's message to the provider with the customer's name", async () => {
      await service.create(
        { conversationId: 'c1', content: 'Are you free tomorrow?' },
        customer,
      );
      await flush();
      expect(pushService.sendForChatMessage).toHaveBeenCalledWith({
        recipient: { recipientId: 'p1', recipientType: 'PROVIDER' },
        conversationId: 'c1',
        senderName: 'Sara',
        content: 'Are you free tomorrow?',
        hasPhoto: false,
      });
    });

    it("pushes a provider's photo to the customer under the business name", async () => {
      messageRepository.findOne.mockImplementationOnce(async () => ({
        id: 'm1',
        senderId: 'p1',
        senderType: ConversationSenderType.PROVIDER,
        ...saved.at(-1),
      }));
      await service.create(
        { conversationId: 'c1', content: '', attachment: photo },
        { sub: 'p1', type: 'provider' } as never,
      );
      await flush();
      expect(pushService.sendForChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: { recipientId: 'u1', recipientType: 'USER' },
          senderName: 'Omar Plumbing',
          hasPhoto: true,
        }),
      );
    });
  });
});
