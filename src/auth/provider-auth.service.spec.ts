/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ProviderAuthService } from './provider-auth.service';
import { OtpCodeGenerator } from './otp-code-generator';

describe('ProviderAuthService OTP generation', () => {
  it('uses an injectable generator without exposing the OTP in registration', async () => {
    const provider = {
      id: 'provider-id',
      email: 'provider@example.com',
      phone: '500000000',
      commercialName: 'Provider',
    };
    const otpRepository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    const providerService = {
      create: jest.fn().mockResolvedValue(provider),
    };
    const emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };
    const smsService = {
      sendVerificationSms: jest.fn().mockResolvedValue(undefined),
    };
    const otpCodeGenerator = { generate: jest.fn(() => '9876') };
    const service = new ProviderAuthService(
      {} as never,
      otpRepository as never,
      providerService as never,
      {} as never,
      emailService as never,
      smsService as never,
      otpCodeGenerator as never,
    );

    const result = await service.register({
      name: 'Provider Owner',
      commercialName: provider.commercialName,
      email: provider.email,
      phone: provider.phone,
      password: 'Secret123!',
    });

    expect(result).toBe(provider);
    expect(result).not.toHaveProperty('otp');
    expect(otpCodeGenerator.generate).toHaveBeenCalledTimes(2);
    expect(otpRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: '9876' }),
    );
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      provider.email,
      '9876',
    );
    expect(smsService.sendVerificationSms).toHaveBeenCalledWith(
      provider.phone,
      '9876',
    );
  });
});

describe('OtpCodeGenerator', () => {
  it('generates exactly four decimal digits', () => {
    const generator = new OtpCodeGenerator();
    for (let index = 0; index < 100; index += 1) {
      expect(generator.generate()).toMatch(/^\d{4}$/);
    }
  });
});
