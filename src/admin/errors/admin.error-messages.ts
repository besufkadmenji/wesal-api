import { ADMIN_ERROR_CODES } from './admin.error-codes';
import { LanguageCode } from 'lib/i18n/language.types';

export const ADMIN_ERROR_MESSAGES: Record<
  keyof typeof ADMIN_ERROR_CODES,
  Record<LanguageCode, string>
> = {
  ADMIN_NOT_FOUND: {
    en: 'Admin not found',
    ar: 'المسؤول غير موجود',
  },
  EMAIL_ALREADY_IN_USE: {
    en: 'Email is already in use',
    ar: 'البريد الإلكتروني قيد الاستخدام بالفعل',
  },
  INVALID_PERMISSION_TYPE: {
    en: 'Invalid permission type',
    ar: 'نوع الإذن غير صحيح',
  },
  INVALID_USER_TYPE: {
    en: 'Invalid user type',
    ar: 'نوع المستخدم غير صحيح',
  },
  INVALID_STATUS: {
    en: 'Invalid status',
    ar: 'الحالة غير صحيحة',
  },
  CANNOT_DELETE_LAST_ADMINISTRATOR: {
    en: 'Cannot delete the last administrator',
    ar: 'لا يمكن حذف آخر مسؤول',
  },
  INVALID_CREDENTIALS: {
    en: 'Invalid email or password',
    ar: 'بريد إلكتروني أو كلمة مرور غير صحيحة',
  },
  INVALID_OTP: {
    en: 'Invalid or expired OTP code',
    ar: 'كود OTP غير صحيح أو منتهي الصلاحية',
  },
  TOO_MANY_OTP_ATTEMPTS: {
    en: 'Too many OTP verification attempts',
    ar: 'عدد كبير جداً من محاولات التحقق من OTP',
  },
  OTP_VERIFICATION_THROTTLED: {
    en: 'Please wait 30 seconds before trying again',
    ar: 'يرجى الانتظار 30 ثانية قبل المحاولة مرة أخرى',
  },
  OTP_IP_MISMATCH: {
    en: 'OTP verification failed due to IP mismatch',
    ar: 'فشل التحقق من OTP بسبب عدم تطابق IP',
  },
  TOO_MANY_OTP_REQUESTS: {
    en: 'Too many OTP requests. Please wait before requesting again',
    ar: 'عدد كبير جداً من طلبات OTP. يرجى الانتظار قبل الطلب مرة أخرى',
  },
  ADMIN_ALREADY_ACTIVE: {
    en: 'Admin is already active',
    ar: 'المسؤول نشط بالفعل',
  },
  ADMIN_ALREADY_INACTIVE: {
    en: 'Admin is already inactive',
    ar: 'المسؤول معطل بالفعل',
  },
  CANNOT_DEACTIVATE_LAST_ADMINISTRATOR: {
    en: 'Cannot deactivate the last active administrator',
    ar: 'لا يمكن تعطيل آخر مسؤول نشط',
  },
  INCORRECT_CURRENT_PASSWORD: {
    en: 'Current password is incorrect',
    ar: 'كلمة المرور الحالية غير صحيحة',
  },
  SUPER_ADMIN_ALREADY_EXISTS: {
    en: 'A super admin already exists. Only one super admin is allowed',
    ar: 'يوجد مسؤول فائق بالفعل. يُسمح بمسؤول فائق واحد فقط',
  },
  CANNOT_REMOVE_SUPER_ADMIN: {
    en: 'Cannot remove super admin role. At least one super admin must exist',
    ar: 'لا يمكن إزالة دور المسؤول الفائق. يجب أن يكون هناك مسؤول فائق واحد على الأقل',
  },
  SIGNATURE_ONLY_FOR_SUPER_ADMIN: {
    en: 'Platform manager signature is only allowed for super admin users',
    ar: 'توقيع مدير المنصة مسموح فقط لمستخدمي المسؤول الفائق',
  },
} as const;
