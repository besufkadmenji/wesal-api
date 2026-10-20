import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { RATING_ERROR_CODES } from './rating.error-codes';

export const RATING_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [RATING_ERROR_CODES.RATING_NOT_FOUND]: {
    en: 'Rating not found',
    ar: 'التقييم غير موجود',
  },
  [RATING_ERROR_CODES.CONTRACT_NOT_FOUND]: {
    en: 'Contract not found',
    ar: 'التعاقد غير موجود',
  },
  [RATING_ERROR_CODES.CONTRACT_NOT_COMPLETED]: {
    en: 'Only completed contracts can be rated',
    ar: 'لا يمكن تقييم التعاقد إلا بعد انتهائه',
  },
  [RATING_ERROR_CODES.DUPLICATE_RATING]: {
    en: 'You have already rated this contract',
    ar: 'لقد قمت بتقييم هذا التعاقد بالفعل',
  },
  [RATING_ERROR_CODES.INVALID_RATING_VALUE]: {
    en: 'Rating must be between 1 and 5',
    ar: 'يجب أن يكون التقييم بين 1 و 5',
  },
  [RATING_ERROR_CODES.INVALID_COMMENT]: {
    en: 'The comment may contain letters, numbers and basic punctuation only (max 1000 characters)',
    ar: 'يجب أن يحتوي التعليق على حروف وأرقام وعلامات ترقيم أساسية فقط (بحد أقصى 1000 حرف)',
  },
  [RATING_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to rate this contract',
    ar: 'ليس لديك صلاحية لتقييم هذا التعاقد',
  },
};
