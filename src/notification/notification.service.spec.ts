import {
  NotificationService,
  NOTIFICATION_ADDED_EVENT,
} from './notification.service';
import { NotificationRecipientType } from './enums/notification-recipient-type.enum';
import { NotificationType } from './enums/notification-type.enum';

describe('NotificationService realtime publishing', () => {
  const saved = {
    id: 'e28aa794-17f0-4b50-8852-e46985b8810e',
    recipientId: 'ecfe4495-c32a-4771-b46e-d61b1520cdec',
    recipientType: NotificationRecipientType.USER,
    type: NotificationType.CONTRACT_UPDATE,
    title: 'Contract update',
    message: 'Contract updated',
    isRead: false,
  };
  const repository = {
    create: jest.fn((value: unknown) => value),
    save: jest.fn(() => Promise.resolve(saved)),
  };
  const userRepository = { findOne: jest.fn() };
  const pubSub = { publish: jest.fn() };
  const service = new NotificationService(
    repository as never,
    userRepository as never,
    pubSub as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('publishes a persisted recipient notification once', async () => {
    pubSub.publish.mockResolvedValue(undefined);

    await expect(
      service.createForRecipient({
        recipientId: saved.recipientId,
        recipientType: saved.recipientType,
        type: saved.type,
        title: saved.title,
        message: saved.message,
      }),
    ).resolves.toBe(saved);
    expect(pubSub.publish).toHaveBeenCalledTimes(1);
    expect(pubSub.publish).toHaveBeenCalledWith(NOTIFICATION_ADDED_EVENT, {
      notificationAdded: saved,
    });
  });

  it('does not fail the persisted operation when realtime publishing fails', async () => {
    pubSub.publish.mockRejectedValue(new Error('broker unavailable'));

    await expect(
      service.createForRecipient({
        recipientId: saved.recipientId,
        recipientType: saved.recipientType,
        type: saved.type,
        title: saved.title,
        message: saved.message,
      }),
    ).resolves.toBe(saved);
  });
});
