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
  [CITY_ERROR_CODES.CITY_IN_USE_BY_PROVIDERS]: {
    en: 'Cannot delete city that is being used by providers',
    ar: 'لا يمكن حذف مدينة مرتبطة بمزودي خدمات',
  },
  [CITY_ERROR_CODES.CITY_HAS_ACTIVE_PROVIDERS]: {
    en: 'Cannot deactivate city that has active providers',
    ar: 'لا يمكن تعطيل مدينة لديها مزودو خدمات نشطون',
  },
  [CITY_ERROR_CODES.CITY_ALREADY_ACTIVE]: {
    en: 'City is already active',
    ar: 'المدينة مفعّلة بالفعل',
  },
  [CITY_ERROR_CODES.CITY_ALREADY_INACTIVE]: {
    en: 'City is already inactive',
    ar: 'المدينة غير مفعّلة بالفعل',
  },
};

// Register city error messages in the central registry
errorMessageRegistry.register(CITY_ERROR_MESSAGES);
