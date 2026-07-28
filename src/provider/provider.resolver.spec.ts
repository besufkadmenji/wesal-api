/* eslint-disable @typescript-eslint/unbound-method */
import { UnauthorizedException } from '@nestjs/common';
import { SUBSCRIPTION_OPTIONS_METADATA } from '@nestjs/graphql/dist/graphql.constants';
import { PERMISSION_KEY } from '../admin/decorators/require-permission.decorator';
import { ProviderResolver } from './provider.resolver';

describe('ProviderResolver security', () => {
  const providerService = {
    findOne: jest.fn(),
    update: jest.fn(),
    removeAvatar: jest.fn(),
  };
  const pubSub = { asyncIterableIterator: jest.fn(() => ({})) };
  const resolver = new ProviderResolver(
    providerService as never,
    pubSub as never,
  );
  const provider = {
    sub: 'provider-id',
    email: 'provider@example.com',
    type: 'provider' as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns null when meProvider is queried with a non-provider token', async () => {
    await expect(
      resolver.getCurrentProvider(undefined, 'en'),
    ).resolves.toBeNull();
    expect(providerService.findOne).not.toHaveBeenCalled();
  });

  it('uses token ownership for profile update and avatar removal', async () => {
    const update = {
      id: 'attacker-controlled-id',
      name: 'Updated provider',
    };

    await resolver.updateProvider(update, provider, 'en');
    await resolver.removeProviderAvatar(provider, 'en');

    expect(providerService.update).toHaveBeenCalledWith(
      provider.sub,
      update,
      'en',
    );
    expect(providerService.removeAvatar).toHaveBeenCalledWith(
      provider.sub,
      'en',
    );
  });

  it('admin-permission scopes generic provider lookup operations', () => {
    expect(
      Reflect.getMetadata(PERMISSION_KEY, ProviderResolver.prototype.findAll),
    ).toEqual({ module: 'provider', action: 'read' });
    expect(
      Reflect.getMetadata(
        PERMISSION_KEY,
        ProviderResolver.prototype.findByEmail,
      ),
    ).toEqual({ module: 'provider', action: 'read' });
    expect(
      Reflect.getMetadata(
        PERMISSION_KEY,
        ProviderResolver.prototype.findByPhone,
      ),
    ).toEqual({ module: 'provider', action: 'read' });
    expect(
      Reflect.getMetadata(
        PERMISSION_KEY,
        ProviderResolver.prototype.createProvider,
      ),
    ).toEqual({ module: 'provider', action: 'update' });
  });

  it('rejects user subscriptions and filters provider events by token identity', () => {
    const options = Reflect.getMetadata(
      SUBSCRIPTION_OPTIONS_METADATA,
      ProviderResolver.prototype.providerUpdated,
    ) as {
      filter: (
        payload: { providerUpdated: { id: string } },
        variables: unknown,
        context: { principal: typeof provider },
      ) => boolean;
    };

    expect(() =>
      resolver.providerUpdated(
        { principal: { ...provider, type: 'user' } },
        { ...provider, type: 'user' },
      ),
    ).toThrow(UnauthorizedException);
    expect(
      options.filter(
        { providerUpdated: { id: provider.sub } },
        {},
        { principal: provider },
      ),
    ).toBe(true);
    expect(
      options.filter(
        { providerUpdated: { id: 'other-provider' } },
        {},
        { principal: provider },
      ),
    ).toBe(false);
  });
});
