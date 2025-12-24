import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { RATING_ERROR_CODES } from './rating.error-codes';

export const RATING_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [RATING_ERROR_CODES.RATING_NOT_FOUND]: {
    en: 'Rating not found',
    ar: 'التقييم غير موجود',
  },
  [RATING_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'المستخدم غير موجود',
  },
  [RATING_ERROR_CODES.ADVERTISEMENT_NOT_FOUND]: {
    en: 'Advertisement not found',
    ar: 'الإعلان غير موجود',
  },
  [RATING_ERROR_CODES.DUPLICATE_RATING]: {
    en: 'You have already rated this advertisement',
    ar: 'لقد قمت بتقييم هذا الإعلان بالفعل',
  },
  [RATING_ERROR_CODES.INVALID_RATING_VALUE]: {
    en: 'Rating must be between 1 and 5',
    ar: 'يجب أن يكون التقييم بين 1 و 5',
  },
  [RATING_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to modify this rating',
    ar: 'ليس لديك صلاحية لتعديل هذا التقييم',
  },
};
