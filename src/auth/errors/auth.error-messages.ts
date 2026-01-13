import { TranslatedError } from 'lib/i18n/i18n.service';
import { AUTH_ERROR_CODES } from './auth.error-codes';

export const AUTH_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: {
    en: 'Invalid credentials',
    ar: 'بيانات الاعتماد غير صحيحة',
  },
  [AUTH_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'المستخدم غير موجود',
  },
  [AUTH_ERROR_CODES.USER_ALREADY_EXISTS]: {
    en: 'User already exists',
    ar: 'المستخدم موجود بالفعل',
  },
  [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]: {
    en: 'Email already exists',
    ar: 'البريد الإلكتروني موجود بالفعل',
  },
  [AUTH_ERROR_CODES.PHONE_ALREADY_EXISTS]: {
    en: 'Phone number already exists',
    ar: 'رقم الهاتف موجود بالفعل',
  },
  [AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED]: {
    en: 'Email is not verified',
    ar: 'البريد الإلكتروني غير موثق',
  },
  [AUTH_ERROR_CODES.PHONE_NOT_VERIFIED]: {
    en: 'Phone number is not verified',
    ar: 'رقم الهاتف غير موثق',
  },
  [AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED]: {
    en: 'Please verify your email and phone number',
    ar: 'يرجى التحقق من بريدك الإلكتروني ورقم هاتفك',
  },
  [AUTH_ERROR_CODES.INVALID_OTP]: {
    en: 'Invalid OTP code',
    ar: 'رمز التحقق غير صحيح',
  },
  [AUTH_ERROR_CODES.OTP_EXPIRED]: {
    en: 'OTP code has expired',
    ar: 'انتهت صلاحية رمز التحقق',
  },
  [AUTH_ERROR_CODES.OTP_ALREADY_USED]: {
    en: 'OTP code has already been used',
    ar: 'تم استخدام رمز التحقق بالفعل',
  },
  [AUTH_ERROR_CODES.OTP_NOT_FOUND]: {
    en: 'OTP not found',
    ar: 'رمز التحقق غير موجود',
  },
  [AUTH_ERROR_CODES.TOO_MANY_OTP_REQUESTS]: {
    en: 'Too many OTP requests. Please try again later',
    ar: 'طلبات كثيرة جدًا لرمز التحقق. يرجى المحاولة لاحقًا',
  },
  [AUTH_ERROR_CODES.TOO_MANY_OTP_ATTEMPTS]: {
    en: 'Too many failed OTP verification attempts. Please request a new OTP',
    ar: 'عدد محاولات التحقق من رمز التحقق كثير جداً. يرجى طلب رمز تحقق جديد',
  },
  [AUTH_ERROR_CODES.OTP_VERIFICATION_THROTTLED]: {
    en: 'Please wait before attempting OTP verification again',
    ar: 'يرجى الانتظار قبل محاولة التحقق من رمز التحقق مرة أخرى',
  },
  [AUTH_ERROR_CODES.OTP_IP_MISMATCH]: {
    en: 'OTP verification failed. IP address mismatch',
    ar: 'فشل التحقق من رمز التحقق. عدم تطابق عنوان IP',
  },
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: {
    en: 'Password must be at least 8 characters long',
    ar: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
  },
  [AUTH_ERROR_CODES.INVALID_TOKEN]: {
    en: 'Invalid or expired token',
    ar: 'الرمز غير صالح أو منتهي الصلاحية',
  },
  [AUTH_ERROR_CODES.PROVIDER_BANK_DETAILS_REQUIRED]: {
    en: 'You must provide bank name and IBAN number',
    ar: 'يجب تقديم اسم البنك ورقم الآيبان',
  },
  [AUTH_ERROR_CODES.COMMERCIAL_REGISTRATION_FILE_REQUIRED]: {
    en: 'Commercial registration file is required for providers',
    ar: 'ملف السجل التجاري مطلوب لمقدمي الخدمات',
  },
};
