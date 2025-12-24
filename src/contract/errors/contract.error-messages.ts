import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { CONTRACT_ERROR_CODES } from './contract.error-codes';

export const CONTRACT_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [CONTRACT_ERROR_CODES.CONTRACT_NOT_FOUND]: {
    en: 'Contract not found',
    ar: 'العقد غير موجود',
  },
  [CONTRACT_ERROR_CODES.CONVERSATION_NOT_FOUND]: {
    en: 'Conversation not found',
    ar: 'المحادثة غير موجودة',
  },
  [CONTRACT_ERROR_CODES.CLIENT_NOT_FOUND]: {
    en: 'Client not found',
    ar: 'العميل غير موجود',
  },
  [CONTRACT_ERROR_CODES.PROVIDER_NOT_FOUND]: {
    en: 'Provider not found',
    ar: 'مقدم الخدمة غير موجود',
  },
  [CONTRACT_ERROR_CODES.UNAUTHORIZED_ACCESS]: {
    en: 'You are not authorized to access this contract',
    ar: 'ليس لديك صلاحية للوصول إلى هذا العقد',
  },
  [CONTRACT_ERROR_CODES.INVALID_STATUS_TRANSITION]: {
    en: 'Invalid status transition',
    ar: 'انتقال حالة غير صالح',
  },
  [CONTRACT_ERROR_CODES.INVALID_PRICE]: {
    en: 'Agreed price must be greater than zero',
    ar: 'يجب أن يكون السعر المتفق عليه أكبر من الصفر',
  },
  [CONTRACT_ERROR_CODES.INVALID_DOWN_PAYMENT]: {
    en: 'Down payment cannot exceed agreed price',
    ar: 'لا يمكن أن تتجاوز الدفعة المقدمة السعر المتفق عليه',
  },
  [CONTRACT_ERROR_CODES.DUPLICATE_CONTRACT]: {
    en: 'A contract already exists for this conversation',
    ar: 'يوجد عقد بالفعل لهذه المحادثة',
  },
};
