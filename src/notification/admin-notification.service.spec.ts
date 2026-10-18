import { PubSub } from 'graphql-subscriptions';
import { Repository } from 'typeorm';
import { Admin } from '../admin/entities/admin.entity';
import {
  ADMIN_NOTIFICATION_ADDED_EVENT,
  AdminNotificationService,
} from './admin-notification.service';
import { Notification } from './entities/notification.entity';
import { NotificationRecipientType } from './enums/notification-recipient-type.enum';
import { NotificationType } from './enums/notification-type.enum';

describe('AdminNotificationService', () => {
  let saved: Array<Partial<Notification>>;
  let adminFind: jest.Mock;
  let publish: jest.Mock;
  let update: jest.Mock;
  let findOne: jest.Mock;
  let save: jest.Mock;
  let service: AdminNotificationService;

  beforeEach(() => {
    saved = [];
    adminFind = jest.fn(() => Promise.resolve([{ id: 'a1' }, { id: 'a2' }]));
    publish = jest.fn(() => Promise.resolve());
    update = jest.fn(() => Promise.resolve());
    findOne = jest.fn();
    save = jest.fn((value: Partial<Notification> | Partial<Notification>[]) => {
      if (Array.isArray(value)) {
        saved = value.map((row, index) => ({ ...row, id: `n${index}` }));
        return Promise.resolve(saved);
      }
      return Promise.resolve(value);
    });
    service = new AdminNotificationService(
      {
        create: jest.fn((value: object) => ({ ...value })),
        save,
        findOne,
        update,
        count: jest.fn(() => Promise.resolve(4)),
        findAndCount: jest.fn(() => Promise.resolve([[], 0])),
      } as unknown as Repository<Notification>,
      { find: adminFind } as unknown as Repository<Admin>,
      { publish } as unknown as PubSub,
    );
  });

  const event = {
    type: NotificationType.ADMIN_NEW_CUSTOMER,
    ar: { title: 'عميل جديد', message: 'سجّل أحمد' },
    en: { title: 'New customer', message: 'Ahmed registered' },
    relatedEntityType: 'user',
    relatedEntityId: 'user-1',
  };

  it('fans out to every active admin in both languages and pushes each copy', async () => {
    await service.notifyAdmins(event);

    expect(adminFind).toHaveBeenCalledWith({
      select: { id: true },
      where: { status: 'ACTIVE' },
    });
    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({
      recipientId: 'a1',
      recipientType: NotificationRecipientType.ADMIN,
      userId: null,
      type: NotificationType.ADMIN_NEW_CUSTOMER,
      title: 'عميل جديد',
      message: 'سجّل أحمد',
      translations: { en: event.en },
      relatedEntityId: 'user-1',
      isRead: false,
    });
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledWith(ADMIN_NOTIFICATION_ADDED_EVENT, {
      adminNotificationAdded: expect.objectContaining({
        recipientId: 'a2',
      }) as Notification,
    });
  });

  it('never throws, so the business action that triggered it still succeeds', async () => {
    adminFind.mockRejectedValueOnce(new Error('db down'));
    await expect(service.notifyAdmins(event)).resolves.toBeUndefined();
    save.mockRejectedValueOnce(new Error('insert failed'));
    await expect(service.notifyAdmins(event)).resolves.toBeUndefined();
  });

  it('does nothing when there are no active admins', async () => {
    adminFind.mockResolvedValueOnce([]);
    await service.notifyAdmins(event);
    expect(save).not.toHaveBeenCalled();
  });

  it('marks only the calling admin’s own notification as read', async () => {
    findOne.mockResolvedValueOnce(null);
    await expect(service.markRead('a1', 'other', 'en')).rejects.toThrow(
      'Notification not found',
    );
    expect(findOne).toHaveBeenCalledWith({
      where: {
        id: 'other',
        recipientId: 'a1',
        recipientType: NotificationRecipientType.ADMIN,
      },
    });

    const own = { id: 'n1', isRead: false } as Notification;
    findOne.mockResolvedValueOnce(own);
    await expect(service.markRead('a1', 'n1', 'en')).resolves.toMatchObject({
      isRead: true,
    });
  });

  it('marks all of one admin’s unread notifications as read', async () => {
    await service.markAllRead('a1');
    expect(update).toHaveBeenCalledWith(
      {
        recipientId: 'a1',
        recipientType: NotificationRecipientType.ADMIN,
        isRead: false,
      },
      expect.objectContaining({ isRead: true }),
    );
  });
});
