import { ADMIN_PERMISSION_ERROR_CODES } from './admin-permission.error-codes';
import { LanguageCode } from 'lib/i18n/language.types';

export const ADMIN_PERMISSION_ERROR_MESSAGES: Record<
  keyof typeof ADMIN_PERMISSION_ERROR_CODES,
  Record<LanguageCode, string>
> = {
  ADMIN_PERMISSION_NOT_FOUND: {
    en: 'Admin permission not found',
    ar: 'صلاحية الأدمن غير موجودة',
  },
  PERMISSION_ALREADY_ASSIGNED: {
    en: 'Permission is already assigned to this admin',
    ar: 'الصلاحية مسندة بالفعل لهذا الأدمن',
  },
  ADMIN_NOT_FOUND: {
    en: 'Admin not found',
    ar: 'الأدمن غير موجود',
  },
  PERMISSION_NOT_FOUND: {
    en: 'Permission not found',
    ar: 'الصلاحية غير موجودة',
  },
} as const;
