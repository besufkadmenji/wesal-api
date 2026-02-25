import { PROVIDER_ERROR_CODES } from './provider.error-codes';

export const PROVIDER_ERROR_MESSAGES: Record<
  string,
  { en: string; ar: string }
> = {
  [PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND]: {
    en: 'Provider not found',
    ar: 'مقدم الخدمة غير موجود',
  },
  [PROVIDER_ERROR_CODES.PROVIDER_ALREADY_EXISTS]: {
    en: 'A provider with this email or phone already exists',
    ar: 'مقدم خدمة بهذا البريد الإلكتروني أو الهاتف موجود بالفعل',
  },
  [PROVIDER_ERROR_CODES.EMAIL_ALREADY_IN_USE]: {
    en: 'This email is already registered',
    ar: 'هذا البريد الإلكتروني مسجل بالفعل',
  },
  [PROVIDER_ERROR_CODES.PHONE_ALREADY_IN_USE]: {
    en: 'This phone number is already registered',
    ar: 'رقم الهاتف هذا مسجل بالفعل',
  },
  [PROVIDER_ERROR_CODES.INVALID_CREDENTIALS]: {
    en: 'Invalid credentials',
    ar: 'بيانات اعتماد غير صحيحة',
  },
  [PROVIDER_ERROR_CODES.EMAIL_NOT_VERIFIED]: {
    en: 'Email not verified',
    ar: 'البريد الإلكتروني غير موثق',
  },
  [PROVIDER_ERROR_CODES.PHONE_NOT_VERIFIED]: {
    en: 'Phone number not verified',
    ar: 'رقم الهاتف غير موثق',
  },
  [PROVIDER_ERROR_CODES.PROVIDER_DEACTIVATED]: {
    en: 'Provider account has been deactivated',
    ar: 'تم إلغاء تفعيل حساب مقدم الخدمة',
  },
  [PROVIDER_ERROR_CODES.PROVIDER_SUSPENDED]: {
    en: 'Provider account is suspended',
    ar: 'حساب مقدم الخدمة معلق',
  },
  [PROVIDER_ERROR_CODES.PROVIDER_REJECTED]: {
    en: 'Provider application was rejected',
    ar: 'تم رفض طلب مقدم الخدمة',
  },
  [PROVIDER_ERROR_CODES.PENDING_APPROVAL]: {
    en: 'Provider account is pending approval',
    ar: 'حساب مقدم الخدمة قيد الموافقة',
  },
  [PROVIDER_ERROR_CODES.CONTRACT_ALREADY_SIGNED]: {
    en: 'Contract has already been signed',
    ar: 'تم توقيع العقد بالفعل',
  },
  [PROVIDER_ERROR_CODES.NO_SIGNED_CONTRACT]: {
    en: 'No signed contract found',
    ar: 'لم يتم العثور على عقد موقع',
  },
  [PROVIDER_ERROR_CODES.CONTRACT_ALREADY_TERMINATED]: {
    en: 'Contract has already been terminated',
    ar: 'تم إنهاء العقد بالفعل',
  },
  [PROVIDER_ERROR_CODES.INVALID_STATUS_TRANSITION]: {
    en: 'Invalid status transition',
    ar: 'تغيير الحالة غير صالح',
  },
  [PROVIDER_ERROR_CODES.PROVIDER_ALREADY_ACTIVE]: {
    en: 'Provider account is already active',
    ar: 'حساب مقدم الخدمة نشط بالفعل',
  },
};
