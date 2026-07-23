import { UnauthorizedException } from '@nestjs/common';
import { ProviderAuthResolver } from './provider-auth.resolver';

describe('ProviderAuthResolver protected mutations', () => {
  const providerAuthService = {
    changePassword: jest.fn(),
    initiateEmailChange: jest.fn(),
    initiatePhoneChange: jest.fn(),
  };
  const resolver = new ProviderAuthResolver(providerAuthService as never);
  const provider = {
    sub: 'provider-id',
    email: 'provider@example.com',
    type: 'provider' as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it('derives provider identity for password and contact changes', async () => {
    providerAuthService.changePassword.mockResolvedValue(true);
    providerAuthService.initiateEmailChange.mockResolvedValue({
      changeToken: 'email-token',
    });
    providerAuthService.initiatePhoneChange.mockResolvedValue({
      changeToken: 'phone-token',
    });

    await resolver.changeProviderPassword(
      { newPassword: 'NewSecret123!' },
      provider,
      'en',
    );
    await resolver.initiateProviderEmailChange(
      { newEmail: 'new@example.com' },
      provider,
      'en',
    );
    await resolver.initiateProviderPhoneChange(
      { newPhone: '511111111', countryCode: '+966' },
      provider,
      'en',
    );

    expect(providerAuthService.changePassword).toHaveBeenCalledWith(
      provider.sub,
      expect.any(Object),
      'en',
    );
    expect(providerAuthService.initiateEmailChange).toHaveBeenCalledWith(
      provider.sub,
      expect.any(Object),
      'en',
    );
    expect(providerAuthService.initiatePhoneChange).toHaveBeenCalledWith(
      provider.sub,
      expect.any(Object),
      'en',
    );
  });

  it('rejects a non-provider principal', async () => {
    await expect(
      resolver.changeProviderPassword(
        { newPassword: 'NewSecret123!' },
        undefined,
        'en',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
