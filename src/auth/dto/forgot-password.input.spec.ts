import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { errorMessageRegistry } from 'lib/errors/error-message.registry';
import { AUTH_ERROR_CODES } from '../errors/auth.error-codes';
import { ForgotPasswordInput } from './forgot-password.input';
import { LoginInput } from './login.input';

/** ClickUp 869fmm9x1: an empty email/phone was answered in English. */
describe('Auth input messages', () => {
  it('rejects an empty email or phone with a translatable code', async () => {
    const [error] = await validate(
      plainToInstance(ForgotPasswordInput, { emailOrPhone: '' }),
    );
    expect(Object.values(error.constraints ?? {})).toEqual([
      AUTH_ERROR_CODES.EMAIL_OR_PHONE_REQUIRED,
    ]);
    expect(
      errorMessageRegistry.get(AUTH_ERROR_CODES.EMAIL_OR_PHONE_REQUIRED)?.ar,
    ).toBe('يرجى إدخال البريد الإلكتروني أو رقم الجوال');
  });

  it('uses the same codes on login', async () => {
    const errors = await validate(
      plainToInstance(LoginInput, { emailOrPhone: '', password: '' }),
    );
    const codes = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    expect(new Set(codes)).toEqual(
      new Set([
        AUTH_ERROR_CODES.EMAIL_OR_PHONE_REQUIRED,
        AUTH_ERROR_CODES.PASSWORD_REQUIRED,
      ]),
    );
  });
});
