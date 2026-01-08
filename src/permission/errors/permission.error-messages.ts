import { PERMISSION_ERROR_CODES } from './permission.error-codes';
import { LanguageCode } from 'lib/i18n/language.types';

export const PERMISSION_ERROR_MESSAGES: Record<
  keyof typeof PERMISSION_ERROR_CODES,
  Record<LanguageCode, string>
> = {
  PERMISSION_NOT_FOUND: {
    en: 'Permission not found',
    ar: 'الصلاحية غير موجودة',
  },
  PERMISSION_ALREADY_EXISTS: {
    en: 'Permission already exists',
    ar: 'الصلاحية موجودة بالفعل',
  },
  INVALID_PERMISSION_PLATFORM: {
    en: 'Invalid permission platform',
    ar: 'منصة الصلاحية غير صحيحة',
  },
} as const;
