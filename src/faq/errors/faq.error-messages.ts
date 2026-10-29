import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { errorMessageRegistry } from '../../../lib/errors/error-message.registry';
import { FAQ_ERROR_CODES } from './faq.error-codes';

/** Same limits and wording as the admin FAQ form (ClickUp 869fmp1t4). */
export const FAQ_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [FAQ_ERROR_CODES.QUESTION_EN_LENGTH]: {
    en: 'Question in English must be 3 to 100 characters long',
    ar: 'السؤال بالإنجليزية يجب أن يكون من 3 إلى 100 حرف',
  },
  [FAQ_ERROR_CODES.QUESTION_AR_LENGTH]: {
    en: 'Question in Arabic must be 3 to 100 characters long',
    ar: 'السؤال بالعربية يجب أن يكون من 3 إلى 100 حرف',
  },
  [FAQ_ERROR_CODES.ANSWER_EN_LENGTH]: {
    en: 'Answer in English must be 10 to 500 characters long',
    ar: 'الإجابة بالإنجليزية يجب أن تكون من 10 إلى 500 حرف',
  },
  [FAQ_ERROR_CODES.ANSWER_AR_LENGTH]: {
    en: 'Answer in Arabic must be 10 to 500 characters long',
    ar: 'الإجابة بالعربية يجب أن تكون من 10 إلى 500 حرف',
  },
};

errorMessageRegistry.register(FAQ_ERROR_MESSAGES);
