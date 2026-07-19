import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { FAVORITE_ERROR_CODES } from './favorite.error-codes';

export const FAVORITE_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [FAVORITE_ERROR_CODES.FAVORITE_NOT_FOUND]: {
    en: 'Favorite not found',
    ar: 'المفضلة غير موجودة',
  },
  [FAVORITE_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'المستخدم غير موجود',
  },
  [FAVORITE_ERROR_CODES.LISTING_NOT_FOUND]: {
    en: 'Listing not found',
    ar: 'الإعلان غير موجود',
  },
  [FAVORITE_ERROR_CODES.PROVIDER_NOT_FOUND]: {
    en: 'Provider not found',
    ar: 'مقدم الخدمة غير موجود',
  },
  [FAVORITE_ERROR_CODES.DUPLICATE_FAVORITE]: {
    en: 'This listing is already in your favorites',
    ar: 'هذا الإعلان موجود بالفعل في المفضلة',
  },
  [FAVORITE_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to access this favorite',
    ar: 'ليس لديك صلاحية للوصول إلى هذه المفضلة',
  },
};
