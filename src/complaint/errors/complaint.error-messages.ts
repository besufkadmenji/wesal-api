import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { COMPLAINT_ERROR_CODES } from './complaint.error-codes';

export const COMPLAINT_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [COMPLAINT_ERROR_CODES.COMPLAINT_NOT_FOUND]: {
    en: 'Complaint not found',
    ar: 'الشكوى غير موجودة',
  },
  [COMPLAINT_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'المستخدم غير موجود',
  },
  [COMPLAINT_ERROR_CODES.ADVERTISEMENT_NOT_FOUND]: {
    en: 'Advertisement not found',
    ar: 'الإعلان غير موجود',
  },
  [COMPLAINT_ERROR_CODES.REVIEWER_NOT_FOUND]: {
    en: 'Reviewer not found',
    ar: 'المراجع غير موجود',
  },
  [COMPLAINT_ERROR_CODES.INVALID_STATUS_TRANSITION]: {
    en: 'Invalid status transition',
    ar: 'انتقال حالة غير صالح',
  },
  [COMPLAINT_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to access this complaint',
    ar: 'ليس لديك صلاحية للوصول إلى هذه الشكوى',
  },
  [COMPLAINT_ERROR_CODES.EMPTY_DESCRIPTION]: {
    en: 'Description cannot be empty',
    ar: 'لا يمكن أن يكون الوصف فارغًا',
  },
};
