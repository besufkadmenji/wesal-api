import { adminOwner, participantOwner, PushService } from './push.service';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import type { Notification } from '../notification/entities/notification.entity';

const sendEachForMulticast = jest.fn();
jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn(() => ({ name: 'wesal-push' })),
  cert: jest.fn((value: unknown) => value),
}));
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => ({ sendEachForMulticast })),
}));

const ENV_KEYS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const;

const notification = {
  id: 'n1',
  recipientId: 'u1',
  recipientType: NotificationRecipientType.USER,
  title: 'تم تحديث التعاقد',
  message: 'رسالة',
  translations: { en: { title: 'Contract updated', message: 'Message' } },
  relatedEntityType: 'contract',
  relatedEntityId: 'c1',
} as unknown as Notification;

const makeRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn((value: unknown) => Promise.resolve(value)),
  create: jest.fn((value: unknown) => value),
  delete: jest.fn(() => Promise.resolve({ affected: 1 })),
});

describe('PushService (ClickUp 869fp1jmt)', () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.FIREBASE_PROJECT_ID = 'wesal-test';
    process.env.FIREBASE_CLIENT_EMAIL =
      'push@wesal-test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----';
  });
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('does nothing when Firebase is not configured', async () => {
    delete process.env.FIREBASE_PRIVATE_KEY;
    const repository = makeRepository();
    const service = new PushService(repository as never);

    await service.sendForNotification(notification);

    expect(repository.find).not.toHaveBeenCalled();
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it("sends each device the notification in that device's language", async () => {
    const repository = makeRepository();
    repository.find.mockResolvedValue([
      { token: 'ar-token', language: 'ar' },
      { token: 'en-token', language: 'en' },
    ]);
    sendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });
    const service = new PushService(repository as never);

    await service.sendForNotification(notification);

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        recipientId: 'u1',
        recipientType: NotificationRecipientType.USER,
      },
    });
    expect(sendEachForMulticast).toHaveBeenCalledTimes(2);
    const [arCall, enCall] = sendEachForMulticast.mock.calls.map(
      ([message]: [{ tokens: string[]; data: Record<string, string> }]) =>
        message,
    );
    expect(arCall.tokens).toEqual(['ar-token']);
    expect(arCall.data).toMatchObject({
      title: 'تم تحديث التعاقد',
      link: '/contracts/c1',
      lang: 'ar',
      notificationId: 'n1',
    });
    expect(enCall.tokens).toEqual(['en-token']);
    expect(enCall.data).toMatchObject({
      title: 'Contract updated',
      lang: 'en',
    });
  });

  it('forgets tokens FCM reports as no longer registered', async () => {
    const repository = makeRepository();
    repository.find.mockResolvedValue([
      { token: 'alive', language: 'en' },
      { token: 'gone', language: 'en' },
    ]);
    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });
    const service = new PushService(repository as never);

    await service.sendForNotification(notification);

    expect(repository.delete).toHaveBeenCalledTimes(1);
    const [criteria] = repository.delete.mock.calls[0] as unknown as [
      { token: { _value: string[] } },
    ];
    expect(criteria.token._value).toEqual(['gone']);
  });

  it('never throws when FCM fails', async () => {
    const repository = makeRepository();
    repository.find.mockResolvedValue([{ token: 't', language: 'ar' }]);
    sendEachForMulticast.mockRejectedValue(new Error('FCM down'));
    const service = new PushService(repository as never);

    await expect(service.sendForNotification(notification)).resolves.toBe(
      undefined,
    );
  });

  it('moves a browser token to whoever signs in on it', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue({
      token: 'shared',
      recipientId: 'old-user',
      recipientType: NotificationRecipientType.USER,
      language: 'ar',
    });
    const service = new PushService(repository as never);

    await service.register(
      'shared',
      'en',
      'Chrome',
      participantOwner({ sub: 'provider-1', type: 'provider' } as never),
    );

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'shared',
        recipientId: 'provider-1',
        recipientType: NotificationRecipientType.PROVIDER,
        language: 'en',
      }),
    );
  });

  it('only removes the token for its own owner', async () => {
    const repository = makeRepository();
    const service = new PushService(repository as never);

    await service.unregister(
      't',
      participantOwner({ sub: 'u1', type: 'user' } as never),
    );

    expect(repository.delete).toHaveBeenCalledWith({
      token: 't',
      recipientId: 'u1',
      recipientType: NotificationRecipientType.USER,
    });
  });

  it('opens the admin panel page for an admin notification', async () => {
    const repository = makeRepository();
    repository.find.mockResolvedValue([
      { token: 'admin-token', language: 'en' },
    ]);
    sendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });
    const service = new PushService(repository as never);

    await service.sendForNotification({
      ...notification,
      recipientId: 'a1',
      recipientType: NotificationRecipientType.ADMIN,
      relatedEntityType: 'provider_request',
      relatedEntityId: 'r1',
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        recipientId: 'a1',
        recipientType: NotificationRecipientType.ADMIN,
      },
    });
    const [[message]] = sendEachForMulticast.mock.calls as [
      [{ data: Record<string, string> }],
    ];
    expect(message.data.link).toBe('/providers/requests/r1');
  });

  it('registers an admin browser as an admin device', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null);
    const service = new PushService(repository as never);

    await service.register('t', 'ar', null, adminOwner({ sub: 'a1' } as never));

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 't',
        recipientId: 'a1',
        recipientType: NotificationRecipientType.ADMIN,
      }),
    );
  });

  it('sends a chat message as one replaceable push per chat', async () => {
    const repository = makeRepository();
    repository.find.mockResolvedValue([
      { token: 'ar-token', language: 'ar' },
      { token: 'en-token', language: 'en' },
    ]);
    sendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });
    const service = new PushService(repository as never);

    await service.sendForChatMessage({
      recipient: {
        recipientId: 'p1',
        recipientType: NotificationRecipientType.PROVIDER,
      },
      conversationId: 'c1',
      senderName: 'Sara',
      content: '',
      hasPhoto: true,
    });

    const messages = sendEachForMulticast.mock.calls.map(
      ([message]: [{ data: Record<string, string> }]) => message.data,
    );
    expect(messages).toEqual([
      expect.objectContaining({
        notificationId: 'chat-c1',
        title: 'Sara',
        body: 'صورة',
        link: '/conversations/c1',
        renotify: '1',
      }),
      expect.objectContaining({ body: 'Photo', lang: 'en' }),
    ]);
  });
});
