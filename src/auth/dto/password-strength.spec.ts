import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { errorMessageRegistry } from 'lib/errors/error-message.registry';
import { AUTH_ERROR_CODES } from '../errors/auth.error-codes';
import { ChangePasswordInput } from './change-password.input';
import { ResetPasswordWithTokenInput } from './reset-password-with-token.input';

const codesFor = async (newPassword: string) => {
  const errors = await validate(
    plainToInstance(ChangePasswordInput, { newPassword }),
  );
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
};

/** ClickUp 869fmmfge: any 8 characters were accepted as a new password. */
describe('New password strength', () => {
  it.each(['qwertyui', '12345678', 'Qwertyui', 'Qwerty12', 'Aa1@'])(
    'rejects %s',
    async (password) => {
      expect(await codesFor(password)).toEqual([
        AUTH_ERROR_CODES.WEAK_PASSWORD,
      ]);
    },
  );

  it.each(['Qwerty1@', 'Aa1@xyz#9'])('accepts %s', async (password) => {
    expect(await codesFor(password)).toEqual([]);
  });

  it('applies to password resets too, with an Arabic message', async () => {
    const errors = await validate(
      plainToInstance(ResetPasswordWithTokenInput, {
        resetToken: 'token',
        newPassword: 'qwertyui',
      }),
    );
    expect(Object.values(errors[0].constraints ?? {})).toEqual([
      AUTH_ERROR_CODES.WEAK_PASSWORD,
    ]);
    expect(errorMessageRegistry.get(AUTH_ERROR_CODES.WEAK_PASSWORD)?.ar).toBe(
      'يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على أحرف كبيرة وصغيرة وأرقام وأحرف خاصة',
    );
  });
});
