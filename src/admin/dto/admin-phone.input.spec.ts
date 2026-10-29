import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { errorMessageRegistry } from '../../../lib/errors/error-message.registry';
import { ADMIN_ERROR_CODES } from '../errors/admin.error-codes';
import '../errors/admin.error-messages';
import { CreateAdminInput } from './create-admin.input';
import { UpdateAdminInput } from './update-admin.input';

const phoneErrors = async (
  type: typeof CreateAdminInput | typeof UpdateAdminInput,
  phoneNumber: string,
) => {
  const errors = await validate(plainToInstance(type, { phoneNumber }), {
    skipMissingProperties: true,
  });
  return Object.values(
    errors.find((error) => error.property === 'phoneNumber')?.constraints ?? {},
  );
};

/** ClickUp 869fmnnb3: an invalid admin phone was answered in English. */
describe('Admin phone number', () => {
  it.each([CreateAdminInput, UpdateAdminInput])(
    'rejects a non-Saudi mobile with a translatable code (%p)',
    async (type) => {
      expect(await phoneErrors(type, '33333333')).toEqual([
        ADMIN_ERROR_CODES.INVALID_SAUDI_MOBILE,
      ]);
      expect(await phoneErrors(type, '0512345678')).toEqual([]);
    },
  );

  it('has an Arabic message for the code', () => {
    expect(
      errorMessageRegistry.get(ADMIN_ERROR_CODES.INVALID_SAUDI_MOBILE)?.ar,
    ).toBe(
      'أدخل رقم جوال سعودي يبدأ بـ 05 ويتكون من 10 أرقام (مثال: 0512345678).',
    );
  });
});
