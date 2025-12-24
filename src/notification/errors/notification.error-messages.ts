import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { NOTIFICATION_ERROR_CODES } from './notification.error-codes';

export const NOTIFICATION_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [NOTIFICATION_ERROR_CODES.NOTIFICATION_NOT_FOUND]: {
    en: 'Notification not found',
    ar: 'الإشعار غير موجود',
  },
  [NOTIFICATION_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'المستخدم غير موجود',
  },
  [NOTIFICATION_ERROR_CODES.EMPTY_TITLE]: {
    en: 'Title cannot be empty',
    ar: 'لا يمكن أن يكون العنوان فارغًا',
  },
  [NOTIFICATION_ERROR_CODES.EMPTY_MESSAGE]: {
    en: 'Message cannot be empty',
    ar: 'لا يمكن أن تكون الرسالة فارغة',
  },
  [NOTIFICATION_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to access this notification',
    ar: 'ليس لديك صلاحية للوصول إلى هذا الإشعار',
  },
};
