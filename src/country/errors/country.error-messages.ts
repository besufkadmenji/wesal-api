import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { errorMessageRegistry } from '../../../lib/errors/error-message.registry';
import { COUNTRY_ERROR_CODES } from './country.error-codes';

export const COUNTRY_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [COUNTRY_ERROR_CODES.COUNTRY_ALREADY_EXISTS]: {
    en: 'A country with this code already exists',
    ar: 'يوجد بالفعل دولة بنفس الرمز',
  },
  [COUNTRY_ERROR_CODES.COUNTRY_NOT_FOUND]: {
    en: 'Country not found',
    ar: 'لم يتم العثور على الدولة',
  },
  [COUNTRY_ERROR_CODES.CODE_ALREADY_IN_USE]: {
    en: 'This country code is already in use',
    ar: 'رمز الدولة هذا قيد الاستخدام بالفعل',
  },
  [COUNTRY_ERROR_CODES.INVALID_COUNTRY_CODE]: {
    en: 'Invalid country code format',
    ar: 'صيغة رمز الدولة غير صحيحة',
  },
  [COUNTRY_ERROR_CODES.COUNTRY_NAME_REQUIRED]: {
    en: 'Country name is required',
    ar: 'اسم الدولة مطلوب',
  },
  [COUNTRY_ERROR_CODES.COUNTRY_CODE_REQUIRED]: {
    en: 'Country code is required',
    ar: 'رمز الدولة مطلوب',
  },
  [COUNTRY_ERROR_CODES.INVALID_COUNTRY_NAME_LENGTH]: {
    en: 'Country name must not exceed 500 characters',
    ar: 'يجب ألا يتجاوز اسم الدولة 500 حرف',
  },
  [COUNTRY_ERROR_CODES.INVALID_COUNTRY_CODE_LENGTH]: {
    en: 'Country code must not exceed 500 characters',
    ar: 'يجب ألا يتجاوز رمز الدولة 500 حرف',
  },
};

// Register country error messages in the central registry
errorMessageRegistry.register(COUNTRY_ERROR_MESSAGES);
