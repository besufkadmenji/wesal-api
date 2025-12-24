import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { CONVERSATION_ERROR_CODES } from './conversation.error-codes';

export const CONVERSATION_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [CONVERSATION_ERROR_CODES.CONVERSATION_NOT_FOUND]: {
    en: 'Conversation not found',
    ar: 'المحادثة غير موجودة',
  },
  [CONVERSATION_ERROR_CODES.ADVERTISEMENT_NOT_FOUND]: {
    en: 'Advertisement not found',
    ar: 'الإعلان غير موجود',
  },
  [CONVERSATION_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'المستخدم غير موجود',
  },
  [CONVERSATION_ERROR_CODES.PROVIDER_NOT_FOUND]: {
    en: 'Provider not found',
    ar: 'مقدم الخدمة غير موجود',
  },
  [CONVERSATION_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to access this conversation',
    ar: 'ليس لديك صلاحية للوصول إلى هذه المحادثة',
  },
  [CONVERSATION_ERROR_CODES.DUPLICATE_CONVERSATION]: {
    en: 'A conversation already exists for this advertisement between these users',
    ar: 'توجد محادثة بالفعل لهذا الإعلان بين هؤلاء المستخدمين',
  },
};
