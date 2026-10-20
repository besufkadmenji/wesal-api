/* eslint-disable @typescript-eslint/unbound-method */
import { PERMISSION_KEY } from '../admin/decorators/require-permission.decorator';
import { ListingStatus } from '../listing/enums/listing.enum';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { SignedContract } from '../signed-contract/signed-contract.entity';
import { SignedContractStatus } from './enums/contract.enum';
import { ProviderStatus } from './enums/provider-status.enum';
import { PROVIDER_ERROR_MESSAGES } from './errors/provider.error-messages';
import { PROVIDER_ERROR_CODES } from './errors/provider.error-codes';
import { ProviderResolver } from './provider.resolver';
import { ProviderService } from './provider.service';

/** S4-58 (D-22): e-contract termination is a request the admin decides. */
describe('ProviderService e-contract termination (S4-58)', () => {
  let provider: Record<string, unknown> & {
    signedContract: Partial<SignedContract>;
  };
  let openContracts: number;
  const tx = {
    update: jest.fn(),
    save: jest.fn((_entity: unknown, value: unknown) => Promise.resolve(value)),
  };
  const manager = {
    count: jest.fn(() => Promise.resolve(openContracts)),
    transaction: jest.fn((work: (m: typeof tx) => unknown) => work(tx)),
  };
  const providerRepository = {
    findOne: jest.fn(() => Promise.resolve(provider)),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
    manager,
  };
  const signedContractService = {
    update: jest.fn((_id: string, changes: Partial<SignedContract>) =>
      Promise.resolve({ ...provider.signedContract, ...changes }),
    ),
  };
  const pubSub = { publish: jest.fn() };
  const emailService = {
    sendContractTerminationEmail: jest.fn(() => Promise.resolve()),
  };
  const adminNotifications = { notifyAdmins: jest.fn() };
  const notifications = { notifyLocalized: jest.fn() };
  const service = new ProviderService(
    providerRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    signedContractService as never,
    pubSub as never,
    emailService as never,
    adminNotifications as never,
    notifications as never,
  );
  const ongoing =
    PROVIDER_ERROR_MESSAGES[
      PROVIDER_ERROR_CODES.CONTRACT_HAS_UNFINISHED_CONTRACTS
    ].en;

  beforeEach(() => {
    jest.clearAllMocks();
    openContracts = 0;
    provider = {
      id: 'p1',
      name: 'Provider',
      email: 'p@x.test',
      phone: '+966500000000',
      languageCode: 'en',
      status: ProviderStatus.ACTIVE,
      signedContract: { id: 'sc1', status: SignedContractStatus.ACTIVE },
    };
  });

  describe('provider request', () => {
    it('records a request and notifies admins without deleting', async () => {
      const result = await service.terminateContract('p1', ' Moving on ');

      expect(signedContractService.update).toHaveBeenCalledWith(
        'sc1',
        expect.objectContaining({
          status: SignedContractStatus.TERMINATION_REQUESTED,
          terminationRequestReason: 'Moving on',
        }),
      );
      expect(adminNotifications.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ADMIN_ECONTRACT_TERMINATION_REQUESTED,
          relatedEntityId: 'sc1',
        }),
      );
      expect(result.status).toBe(ProviderStatus.ACTIVE);
      expect(result.deletedAt).toBeUndefined();
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('is refused while customer contracts are unfinished', async () => {
      openContracts = 2;
      await expect(service.terminateContract('p1', 'x')).rejects.toThrow(
        ongoing,
      );
      expect(signedContractService.update).not.toHaveBeenCalled();
    });

    it('is refused when a request is already waiting', async () => {
      provider.signedContract.status =
        SignedContractStatus.TERMINATION_REQUESTED;
      await expect(service.terminateContract('p1', 'x')).rejects.toThrow(
        PROVIDER_ERROR_MESSAGES[
          PROVIDER_ERROR_CODES.TERMINATION_ALREADY_REQUESTED
        ].en,
      );
    });
  });

  describe('admin decision', () => {
    beforeEach(() => {
      provider.signedContract = {
        id: 'sc1',
        status: SignedContractStatus.TERMINATION_REQUESTED,
        terminationRequestReason: 'Moving on',
      };
    });

    it('approval deletes the account, unpublishes ads and emails', async () => {
      const saved = await service.approveContractTermination('a1', 'p1');

      expect(tx.update).toHaveBeenCalledWith(
        SignedContract,
        'sc1',
        expect.objectContaining({
          status: SignedContractStatus.TERMINATED_BY_PROVIDER,
          terminationReason: 'Moving on',
          terminationDecidedByAdminId: 'a1',
        }),
      );
      expect(tx.update).toHaveBeenCalledWith(
        expect.anything(),
        { providerId: 'p1' },
        { status: ListingStatus.INACTIVE },
      );
      expect(saved.status).toBe(ProviderStatus.DELETED);
      expect(saved.email).toBe('DELETED_p1_p@x.test');
      expect(saved.phone).toBe('DELETED_p1_+966500000000');
      expect(emailService.sendContractTerminationEmail).toHaveBeenCalledWith(
        'p@x.test',
        'Moving on',
        'en',
        'Provider',
      );
    });

    it('approval re-checks unfinished contracts', async () => {
      openContracts = 1;
      await expect(
        service.approveContractTermination('a1', 'p1'),
      ).rejects.toThrow(ongoing);
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('rejection reactivates the contract and notifies the provider', async () => {
      const result = await service.rejectContractTermination(
        'a1',
        'p1',
        ' Finish your open work first ',
      );

      expect(signedContractService.update).toHaveBeenCalledWith(
        'sc1',
        expect.objectContaining({
          status: SignedContractStatus.ACTIVE,
          terminationRejectionReason: 'Finish your open work first',
          terminationDecidedByAdminId: 'a1',
        }),
      );
      expect(result.signedContract?.status).toBe(SignedContractStatus.ACTIVE);
      expect(notifications.notifyLocalized).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'p1',
          type: NotificationType.ECONTRACT_TERMINATION_REJECTED,
        }),
      );
    });

    it('needs a pending request to approve or reject', async () => {
      provider.signedContract.status = SignedContractStatus.ACTIVE;
      const missing =
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.NO_TERMINATION_REQUEST].en;
      await expect(
        service.approveContractTermination('a1', 'p1'),
      ).rejects.toThrow(missing);
      await expect(
        service.rejectContractTermination('a1', 'p1', 'no'),
      ).rejects.toThrow(missing);
    });
  });

  it("refuses the admin's own termination while contracts are unfinished", async () => {
    const adminRepository = { findOne: jest.fn(() => Promise.resolve({})) };
    const withAdmin = new ProviderService(
      providerRepository as never,
      adminRepository as never,
      {} as never,
      {} as never,
      {} as never,
      signedContractService as never,
      pubSub as never,
      emailService as never,
    );
    openContracts = 3;
    await expect(
      withAdmin.adminTerminateContract('a1', {
        providerId: 'p1',
        terminationReason: 'x',
      }),
    ).rejects.toThrow(ongoing);
    expect(signedContractService.update).not.toHaveBeenCalled();
  });

  it('guards the admin decisions with provider:update', () => {
    for (const handler of [
      ProviderResolver.prototype.approveProviderContractTermination,
      ProviderResolver.prototype.rejectProviderContractTermination,
    ]) {
      expect(Reflect.getMetadata(PERMISSION_KEY, handler)).toEqual({
        module: 'provider',
        action: 'update',
      });
    }
  });
});
