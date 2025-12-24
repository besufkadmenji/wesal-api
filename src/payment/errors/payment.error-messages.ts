import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { PAYMENT_ERROR_CODES } from './payment.error-codes';

export const PAYMENT_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND]: {
    en: 'Payment not found',
    ar: 'الدفع غير موجود',
  },
  [PAYMENT_ERROR_CODES.CONTRACT_NOT_FOUND]: {
    en: 'Contract not found',
    ar: 'العقد غير موجود',
  },
  [PAYMENT_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'المستخدم غير موجود',
  },
  [PAYMENT_ERROR_CODES.INVALID_AMOUNT]: {
    en: 'Payment amount must be greater than zero',
    ar: 'يجب أن يكون مبلغ الدفع أكبر من الصفر',
  },
  [PAYMENT_ERROR_CODES.INVALID_STATUS_TRANSITION]: {
    en: 'Invalid payment status transition',
    ar: 'انتقال حالة الدفع غير صالح',
  },
  [PAYMENT_ERROR_CODES.PAYMENT_ALREADY_COMPLETED]: {
    en: 'Payment has already been completed',
    ar: 'تم إكمال الدفع بالفعل',
  },
  [PAYMENT_ERROR_CODES.PAYMENT_ALREADY_REFUNDED]: {
    en: 'Payment has already been refunded',
    ar: 'تم استرداد الدفع بالفعل',
  },
  [PAYMENT_ERROR_CODES.GATEWAY_ERROR]: {
    en: 'Payment gateway error occurred',
    ar: 'حدث خطأ في بوابة الدفع',
  },
};
