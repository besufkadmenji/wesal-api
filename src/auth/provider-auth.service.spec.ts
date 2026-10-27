/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ProviderAuthService } from './provider-auth.service';
import { MOCK_OTP_CODE, OtpCodeGenerator } from './otp-code-generator';

describe('ProviderAuthService OTP generation', () => {
  it('uses an injectable generator without exposing the OTP in registration', async () => {
    const provider = {
      id: 'provider-id',
      email: 'provider@example.com',
      phone: '500000000',
      commercialName: 'Provider',
    };
    const otpRepository = {
      update: jest.fn().mockResolvedValue(undefined),
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
    // ClickUp 869fmm77y: older unused codes are retired before a new one.
    expect(otpRepository.update).toHaveBeenCalledWith(
      { target: provider.phone, type: 'PHONE_VERIFICATION', isUsed: false },
      { isUsed: true },
    );
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      provider.email,
      '9876',
      'en',
    );
    expect(smsService.sendVerificationSms).toHaveBeenCalledWith(
      provider.phone,
      '9876',
    );
  });
});

describe('OtpCodeGenerator', () => {
  it('uses the shared fixed code while SMS is mocked', () => {
    expect(new OtpCodeGenerator().generate()).toBe(MOCK_OTP_CODE);
    expect(MOCK_OTP_CODE).toBe('1234');
  });
});

/** ClickUp 869fkvqgf: a resend answered "sent" when the email failed. */
describe('ProviderAuthService resendOtp delivery', () => {
  const build = (emailSent: boolean) => {
    const provider = { id: 'provider-id', email: 'p@example.com' };
    const service = new ProviderAuthService(
      { findOne: jest.fn().mockResolvedValue(provider) } as never,
      {
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn((value: object) => value),
        save: jest.fn((value: object) => Promise.resolve(value)),
      } as never,
      {} as never,
      {} as never,
      {
        sendVerificationEmail: jest.fn().mockResolvedValue(emailSent),
      } as never,
      {} as never,
      { generate: () => '1234' } as never,
    );
    return service;
  };
  const input = {
    target: 'p@example.com',
    type: 'EMAIL_VERIFICATION',
  } as never;

  it('says so, in Arabic, when the email could not be sent', async () => {
    await expect(build(false).resendOtp(input, 'ar')).rejects.toMatchObject({
      response: {
        statusCode: 503,
        message: 'تعذر إرسال رمز التحقق. يرجى المحاولة مرة أخرى بعد قليل.',
      },
    });
  });

  it('answers true when the email went out', async () => {
    await expect(build(true).resendOtp(input, 'ar')).resolves.toBe(true);
  });
});
