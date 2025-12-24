import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { MESSAGE_ERROR_CODES } from './message.error-codes';

export const MESSAGE_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [MESSAGE_ERROR_CODES.MESSAGE_NOT_FOUND]: {
    en: 'Message not found',
    ar: 'الرسالة غير موجودة',
  },
  [MESSAGE_ERROR_CODES.CONVERSATION_NOT_FOUND]: {
    en: 'Conversation not found',
    ar: 'المحادثة غير موجودة',
  },
  [MESSAGE_ERROR_CODES.SENDER_NOT_FOUND]: {
    en: 'Sender not found',
    ar: 'المرسل غير موجود',
  },
  [MESSAGE_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to access this message',
    ar: 'ليس لديك صلاحية للوصول إلى هذه الرسالة',
  },
  [MESSAGE_ERROR_CODES.EMPTY_MESSAGE_CONTENT]: {
    en: 'Message content cannot be empty',
    ar: 'لا يمكن أن يكون محتوى الرسالة فارغًا',
  },
};
