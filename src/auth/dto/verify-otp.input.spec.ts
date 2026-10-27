import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { errorMessageRegistry } from 'lib/errors/error-message.registry';
import { OtpType } from '../enums/otp-type.enum';
import { AUTH_ERROR_CODES } from '../errors/auth.error-codes';
import { VerifyOtpInput } from './verify-otp.input';

/** ClickUp 869fmm77y: a short code answered in English on the Arabic site. */
describe('VerifyOtpInput code validation', () => {
  it('rejects a short code with a translatable message code', async () => {
    const input = plainToInstance(VerifyOtpInput, {
      target: '+966500000000',
      code: '123',
      type: OtpType.PHONE_VERIFICATION,
    });
    const [error] = await validate(input);
    expect(error.property).toBe('code');
    expect(Object.values(error.constraints ?? {})).toEqual([
      AUTH_ERROR_CODES.OTP_CODE_FORMAT,
    ]);
    expect(errorMessageRegistry.get(AUTH_ERROR_CODES.OTP_CODE_FORMAT)).toEqual({
      en: 'The verification code must be 4 digits',
      ar: 'رمز التحقق يجب أن يتكون من 4 أرقام',
    });
  });
});
