import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { errorMessageRegistry } from '../../../lib/errors/error-message.registry';
import { CITY_ERROR_CODES } from './city.error-codes';

export const CITY_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [CITY_ERROR_CODES.CITY_ALREADY_EXISTS]: {
    en: 'A city with this name already exists in this country',
    ar: 'توجد مدينة بنفس الاسم في هذا البلد',
  },
  [CITY_ERROR_CODES.CITY_NOT_FOUND]: {
    en: 'City not found',
    ar: 'لم يتم العثور على المدينة',
  },
  [CITY_ERROR_CODES.CITY_NAME_REQUIRED]: {
    en: 'City name is required',
    ar: 'اسم المدينة مطلوب',
  },
  [CITY_ERROR_CODES.COUNTRY_ID_REQUIRED]: {
    en: 'Country ID is required',
    ar: 'معرف الدولة مطلوب',
  },
  [CITY_ERROR_CODES.INVALID_CITY_NAME_LENGTH]: {
    en: 'City name must not exceed 500 characters',
    ar: 'يجب ألا يتجاوز اسم المدينة 500 حرف',
  },
  [CITY_ERROR_CODES.INVALID_COUNTRY_ID]: {
    en: 'Invalid country ID format',
    ar: 'صيغة معرف الدولة غير صحيحة',
  },
  [CITY_ERROR_CODES.CITY_IN_USE]: {
    en: 'Cannot delete city that is being used by users',
    ar: 'لا يمكن حذف مدينة يستخدمها المستخدمون',
  },
};

// Register city error messages in the central registry
errorMessageRegistry.register(CITY_ERROR_MESSAGES);
