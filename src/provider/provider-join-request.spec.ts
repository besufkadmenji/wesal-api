import { NotificationType } from '../notification/enums/notification-type.enum';
import { Provider } from './entities/provider.entity';
import { ProviderService } from './provider.service';

/** ClickUp 869fkvr7t: sign-up alone is not a join request for admins. */
describe('ProviderService join-request notification', () => {
  const providerRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((value: object) => ({ id: 'p1', ...value })),
    save: jest.fn((value: object) => Promise.resolve(value)),
  };
  const adminNotifications = { notifyAdmins: jest.fn() };
  const service = new ProviderService(
    providerRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    adminNotifications as never,
  );

  beforeEach(() => adminNotifications.notifyAdmins.mockReset());

  it('does not notify admins at sign-up', async () => {
    await service.create({
      name: 'Owner',
      commercialName: 'qq',
      email: 'qq@example.com',
      phone: '+966551515151',
      password: 'Secret123!',
    });
    expect(adminNotifications.notifyAdmins).not.toHaveBeenCalled();
  });

  it('sends the join request with a link to it', async () => {
    await service.notifyJoinRequest({
      id: 'p1',
      name: 'Owner',
      commercialName: 'qq',
    } as Provider);
    expect(adminNotifications.notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.ADMIN_PROVIDER_REQUEST,
        relatedEntityType: 'provider_request',
        relatedEntityId: 'p1',
        en: expect.objectContaining({
          message: 'New join request from qq',
        }) as unknown,
      }),
    );
  });
});
