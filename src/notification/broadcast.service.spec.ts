import { Repository } from 'typeorm';
import { AdminPermissionType } from '../admin/enums/admin-permission-type.enum';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { Provider } from '../provider/entities/provider.entity';
import { User } from '../user/entities/user.entity';
import { BroadcastService, BROADCAST_INSERT_CHUNK } from './broadcast.service';
import { NotificationBroadcast } from './entities/notification-broadcast.entity';
import { Notification } from './entities/notification.entity';
import {
  BroadcastAudience,
  BroadcastRecipientType,
} from './enums/broadcast.enum';
import { NotificationRecipientType } from './enums/notification-recipient-type.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationService } from './notification.service';

const admin: AdminJwtPayload = {
  sub: '00000000-0000-4000-8000-0000000000ad',
  email: 'a@x.com',
  permissionType: AdminPermissionType.SUPER_ADMIN,
};

describe('BroadcastService', () => {
  let users: Array<{ id: string; name?: string }>;
  let providers: Array<{ id: string; name?: string; commercialName?: string }>;
  let savedRows: Array<Partial<Notification>>;
  let saveOptions: unknown;
  let userFind: jest.Mock;
  let providerFind: jest.Mock;
  let publishSafely: jest.Mock;
  let service: BroadcastService;

  beforeEach(() => {
    users = [{ id: 'u1', name: 'Customer One' }, { id: 'u2' }];
    providers = [{ id: 'p1', commercialName: 'Provider Co' }];
    savedRows = [];
    userFind = jest.fn((options: { where: { id?: { _value: string[] } } }) => {
      const ids = options.where.id?._value;
      return Promise.resolve(
        ids ? users.filter((u) => ids.includes(u.id)) : users,
      );
    });
    providerFind = jest.fn(
      (options: { where: { id?: { _value: string[] } } }) => {
        const ids = options.where.id?._value;
        return Promise.resolve(
          ids ? providers.filter((p) => ids.includes(p.id)) : providers,
        );
      },
    );
    publishSafely = jest.fn(() => Promise.resolve());
    const manager = {
      create: jest.fn((_entity: unknown, value: object) => ({ ...value })),
      save: jest.fn(
        (entity: unknown, value: object | object[], options?: unknown) => {
          if (entity === Notification) {
            saveOptions = options;
            savedRows = value as Array<Partial<Notification>>;
            return Promise.resolve(
              savedRows.map((row, index) => ({ ...row, id: `n${index}` })),
            );
          }
          return Promise.resolve({ ...value, id: 'broadcast-1' });
        },
      ),
    };

    service = new BroadcastService(
      {
        manager: {
          transaction: (fn: (m: typeof manager) => unknown) => fn(manager),
        },
      } as unknown as Repository<NotificationBroadcast>,
      { find: userFind } as unknown as Repository<User>,
      { find: providerFind } as unknown as Repository<Provider>,
      { publishSafely } as unknown as NotificationService,
    );
  });

  const input = (overrides: object = {}) => ({
    title: ' Maintenance ',
    message: ' Tonight 2am ',
    recipientTypes: [BroadcastRecipientType.USER],
    audience: BroadcastAudience.ALL,
    ...overrides,
  });

  it('sends to every active account of the chosen types and publishes each', async () => {
    const result = await service.send(
      input({
        recipientTypes: [
          BroadcastRecipientType.USER,
          BroadcastRecipientType.PROVIDER,
        ],
      }),
      admin,
      'en',
    );

    expect(result).toMatchObject({
      id: 'broadcast-1',
      title: 'Maintenance',
      recipientCount: 3,
      recipients: null,
      createdByAdminId: admin.sub,
    });
    expect(savedRows).toHaveLength(3);
    expect(savedRows[0]).toMatchObject({
      recipientId: 'u1',
      recipientType: NotificationRecipientType.USER,
      userId: 'u1',
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Maintenance',
      message: 'Tonight 2am',
      relatedEntityType: 'broadcast',
      relatedEntityId: 'broadcast-1',
    });
    expect(savedRows[2]).toMatchObject({
      recipientId: 'p1',
      recipientType: NotificationRecipientType.PROVIDER,
      userId: null,
    });
    expect(saveOptions).toEqual({ chunk: BROADCAST_INSERT_CHUNK });
    expect(publishSafely).toHaveBeenCalledTimes(3);
    // Only active, non-deleted accounts are loaded.
    expect(userFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          isActive: true,
        }) as unknown,
      }),
    );
  });

  it('sends only to hand-picked active accounts and records them', async () => {
    const result = await service.send(
      input({
        audience: BroadcastAudience.SELECTED,
        recipients: [{ id: 'u1', type: BroadcastRecipientType.USER }],
      }),
      admin,
      'en',
    );

    expect(result.recipientCount).toBe(1);
    expect(result.recipients).toEqual([
      { id: 'u1', type: BroadcastRecipientType.USER, name: 'Customer One' },
    ]);
    expect(savedRows.map((row) => row.recipientId)).toEqual(['u1']);
  });

  it('rejects a selected account that is inactive or of another type', async () => {
    await expect(
      service.send(
        input({
          audience: BroadcastAudience.SELECTED,
          recipients: [{ id: 'gone', type: BroadcastRecipientType.USER }],
        }),
        admin,
        'en',
      ),
    ).rejects.toThrow('not active accounts');
    await expect(
      service.send(
        input({
          audience: BroadcastAudience.SELECTED,
          recipients: [{ id: 'p1', type: BroadcastRecipientType.PROVIDER }],
        }),
        admin,
        'en',
      ),
    ).rejects.toThrow('not active accounts');
    expect(publishSafely).not.toHaveBeenCalled();
  });

  it('validates title, body, types, selection and empty audiences', async () => {
    await expect(
      service.send(input({ title: '  ' }), admin, 'en'),
    ).rejects.toThrow('Title cannot be empty');
    await expect(
      service.send(input({ message: '' }), admin, 'ar'),
    ).rejects.toThrow('لا يمكن أن تكون الرسالة فارغة');
    await expect(
      service.send(input({ recipientTypes: [] }), admin, 'en'),
    ).rejects.toThrow('at least one recipient type');
    await expect(
      service.send(
        input({ audience: BroadcastAudience.SELECTED, recipients: [] }),
        admin,
        'en',
      ),
    ).rejects.toThrow('at least one recipient');
    users = [];
    await expect(service.send(input(), admin, 'en')).rejects.toThrow(
      'no active accounts',
    );
  });
});
