import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { errorMessageRegistry } from '../../../lib/errors/error-message.registry';
import { USER_ERROR_CODES } from './user.error-codes';

export const USER_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [USER_ERROR_CODES.USER_ALREADY_EXISTS]: {
    en: 'A user with this email or phone already exists',
    ar: 'يوجد بالفعل مستخدم بنفس البريد الإلكتروني أو رقم الهاتف',
  },
  [USER_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'لم يتم العثور على المستخدم',
  },
  [USER_ERROR_CODES.EMAIL_ALREADY_IN_USE]: {
    en: 'This email is already in use',
    ar: 'هذا البريد الإلكتروني قيد الاستخدام بالفعل',
  },
  [USER_ERROR_CODES.PHONE_ALREADY_IN_USE]: {
    en: 'This phone number is already in use',
    ar: 'رقم الهاتف هذا قيد الاستخدام بالفعل',
  },
  [USER_ERROR_CODES.INVALID_CREDENTIALS]: {
    en: 'Invalid email or password',
    ar: 'بريد إلكتروني أو كلمة مرور غير صحيحة',
  },
  [USER_ERROR_CODES.USER_INACTIVE]: {
    en: 'This user account is inactive',
    ar: 'حساب المستخدم هذا غير نشط',
  },
  [USER_ERROR_CODES.INVALID_EMAIL_FORMAT]: {
    en: 'Please provide a valid email address',
    ar: 'يرجى إدخال عنوان بريد إلكتروني صحيح',
  },
  [USER_ERROR_CODES.PASSWORD_TOO_SHORT]: {
    en: 'Password must be at least 6 characters long',
    ar: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
  },
  [USER_ERROR_CODES.INVALID_PHONE_FORMAT]: {
    en: 'Invalid phone number format (use E.164 format)',
    ar: 'صيغة رقم الهاتف غير صحيحة (استخدم صيغة E.164)',
  },
  [USER_ERROR_CODES.INVALID_PASSWORD_LENGTH]: {
    en: 'Password must be 6-128 characters',
    ar: 'يجب أن تكون كلمة المرور من 6 إلى 128 حرفًا',
  },
  [USER_ERROR_CODES.INVALID_FULLNAME_LENGTH]: {
    en: 'Full name must not exceed 500 characters',
    ar: 'يجب ألا يتجاوز الاسم الكامل 500 حرف',
  },
  [USER_ERROR_CODES.INVALID_AVATAR_URL_LENGTH]: {
    en: 'Avatar URL must not exceed 500 characters',
    ar: 'يجب ألا يتجاوز رابط الصورة الرمزية 500 حرف',
  },
  [USER_ERROR_CODES.INVALID_COUNTRY_ID]: {
    en: 'Country ID must be a valid UUID',
    ar: 'معرف الدولة يجب أن يكون UUID صالحًا',
  },
  [USER_ERROR_CODES.INVALID_CITY_ID]: {
    en: 'City ID must be a valid UUID',
    ar: 'معرف المدينة يجب أن يكون UUID صالحًا',
  },
  [USER_ERROR_CODES.INVALID_LANGUAGE_CODE]: {
    en: 'Language code must not exceed 10 characters',
    ar: 'يجب ألا يتجاوز رمز اللغة 10 أحرف',
  },
  [USER_ERROR_CODES.PHONE_CAN_NOT_BE_EMPTY]: {
    en: 'Phone number is required',
    ar: 'رقم الهاتف مطلوب',
  },
  [USER_ERROR_CODES.EMAIL_CAN_NOT_BE_EMPTY]: {
    en: 'Email is required',
    ar: 'البريد الإلكتروني مطلوب',
  },
  [USER_ERROR_CODES.PASSWORD_CAN_NOT_BE_EMPTY]: {
    en: 'Password is required',
    ar: 'كلمة المرور مطلوبة',
  },
  [USER_ERROR_CODES.FULLNAME_CAN_NOT_BE_EMPTY]: {
    en: 'Full name is required',
    ar: 'الاسم الكامل مطلوب',
  },
  [USER_ERROR_CODES.EMAIL_PHONE_IMMUTABLE]: {
    en: 'Email and phone cannot be changed',
    ar: 'لا يمكن تغيير البريد الإلكتروني والهاتف',
  },
  [USER_ERROR_CODES.NAME_CANNOT_BE_REMOVED]: {
    en: 'Name cannot be removed',
    ar: 'لا يمكن حذف الاسم',
  },
  [USER_ERROR_CODES.BANK_NAME_CANNOT_BE_REMOVED]: {
    en: 'Bank name cannot be removed',
    ar: 'لا يمكن حذف اسم البنك',
  },
  [USER_ERROR_CODES.IBAN_CANNOT_BE_REMOVED]: {
    en: 'IBAN cannot be removed',
    ar: 'لا يمكن حذف رقم الآيبان',
  },
  [USER_ERROR_CODES.ADDRESS_CANNOT_BE_REMOVED]: {
    en: 'Address cannot be removed',
    ar: 'لا يمكن حذف العنوان',
  },
  [USER_ERROR_CODES.LATITUDE_CANNOT_BE_REMOVED]: {
    en: 'Latitude cannot be removed',
    ar: 'لا يمكن حذف خط العرض',
  },
  [USER_ERROR_CODES.LONGITUDE_CANNOT_BE_REMOVED]: {
    en: 'Longitude cannot be removed',
    ar: 'لا يمكن حذف خط الطول',
  },
};

// Register user error messages in the central registry
errorMessageRegistry.register(USER_ERROR_MESSAGES);
