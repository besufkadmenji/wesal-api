import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { ADVERTISEMENT_ERROR_CODES } from './advertisement.error-codes';

export const ADVERTISEMENT_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [ADVERTISEMENT_ERROR_CODES.ADVERTISEMENT_NOT_FOUND]: {
    en: 'Advertisement not found',
    ar: 'الإعلان غير موجود',
  },
  [ADVERTISEMENT_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'المستخدم غير موجود',
  },
  [ADVERTISEMENT_ERROR_CODES.CATEGORY_NOT_FOUND]: {
    en: 'Category not found',
    ar: 'الفئة غير موجودة',
  },
  [ADVERTISEMENT_ERROR_CODES.CITY_NOT_FOUND]: {
    en: 'City not found',
    ar: 'المدينة غير موجودة',
  },
  [ADVERTISEMENT_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to access this advertisement',
    ar: 'ليس لديك صلاحية للوصول إلى هذا الإعلان',
  },
  [ADVERTISEMENT_ERROR_CODES.INVALID_STATUS_TRANSITION]: {
    en: 'Invalid status transition',
    ar: 'انتقال حالة غير صالح',
  },
  [ADVERTISEMENT_ERROR_CODES.INVALID_PRICE]: {
    en: 'Price must be greater than zero',
    ar: 'يجب أن يكون السعر أكبر من الصفر',
  },
};
