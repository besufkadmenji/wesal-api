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
  [CONTRACT_ERROR_CODES.CONTRACT_NOT_LATEST]: {
    en: 'Only the latest contract version can be changed',
    ar: 'يمكن تغيير أحدث نسخة من العقد فقط',
  },
  [CONTRACT_ERROR_CODES.INVALID_DELIVERY_TIME]: {
    en: 'Execution time exceeds the maximum hours allowed for this category',
    ar: 'مدة التنفيذ تتجاوز الحد الأقصى من الساعات المسموح به لهذا القسم',
  },
  [CONTRACT_ERROR_CODES.DELIVERY_HOURS_REQUIRED]: {
    en: 'Delivery time in hours is required for this contract',
    ar: 'مدة التوصيل بالساعات مطلوبة لهذا العقد',
  },
  [CONTRACT_ERROR_CODES.DELIVERY_COMPANY_NOT_FOUND]: {
    en: 'Delivery company not found or inactive',
    ar: 'شركة التوصيل غير موجودة أو غير مفعلة',
  },
  [CONTRACT_ERROR_CODES.CATEGORY_NOT_FOUND]: {
    en: 'Contract category not found',
    ar: 'قسم العقد غير موجود',
  },
  [CONTRACT_ERROR_CODES.SIGNATURE_ALREADY_EXISTS]: {
    en: 'This contract signature has already been submitted',
    ar: 'تم إرسال هذا التوقيع مسبقًا',
  },
  [CONTRACT_ERROR_CODES.CUSTOMER_SIGNATURE_REQUIRED]: {
    en: 'A signature is required for your first contract',
    ar: 'التوقيع مطلوب عند إنشاء عقدك الأول',
  },
  [CONTRACT_ERROR_CODES.REJECTION_REASON_REQUIRED]: {
    en: 'A rejection reason is required',
    ar: 'سبب الرفض مطلوب',
  },
  [CONTRACT_ERROR_CODES.INVOICE_NOT_AVAILABLE]: {
    en: 'The invoice is available once the contract has been paid',
    ar: 'تتوفر الفاتورة بعد سداد قيمة التعاقد',
  },
  [CONTRACT_ERROR_CODES.CHECKOUT_PENDING]: {
    en: 'A payment for this contract is in progress. Try again in a few minutes',
    ar: 'هناك عملية دفع جارية لهذا العقد، حاول مرة أخرى بعد بضع دقائق',
  },
  [CONTRACT_ERROR_CODES.CATEGORY_INACTIVE]: {
    en: 'This section is currently unavailable',
    ar: 'هذا القسم غير متاح حالياً',
  },
};
