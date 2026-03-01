import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { CATEGORY_ERROR_CODES } from './category.error-codes';

export const CATEGORY_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [CATEGORY_ERROR_CODES.CATEGORY_NOT_FOUND]: {
    en: 'Category not found',
    ar: 'الفئة غير موجودة',
  },
  [CATEGORY_ERROR_CODES.PARENT_CATEGORY_NOT_FOUND]: {
    en: 'Parent category not found',
    ar: 'الفئة الأم غير موجودة',
  },
  [CATEGORY_ERROR_CODES.INVALID_PARENT_CATEGORY]: {
    en: 'Cannot set category as its own parent',
    ar: 'لا يمكن تعيين الفئة كأم لنفسها',
  },
  [CATEGORY_ERROR_CODES.CATEGORY_HAS_CHILDREN]: {
    en: 'Cannot delete category that has children',
    ar: 'لا يمكن حذف فئة لها فئات فرعية',
  },
  [CATEGORY_ERROR_CODES.CATEGORY_IN_USE]: {
    en: 'Cannot delete category that is used by listings',
    ar: 'لا يمكن حذف فئة مستخدمة في إعلانات',
  },
  [CATEGORY_ERROR_CODES.CATEGORY_IN_USE_BY_PROVIDERS]: {
    en: 'Cannot delete category that is assigned to providers',
    ar: 'لا يمكن حذف فئة مرتبطة بمزودي خدمة',
  },
  [CATEGORY_ERROR_CODES.CATEGORY_HAS_ACTIVE_PROVIDERS]: {
    en: 'Cannot deactivate category that has active providers assigned to it',
    ar: 'لا يمكن تعطيل فئة لديها مزودو خدمة نشطون مرتبطون بها',
  },
  [CATEGORY_ERROR_CODES.CATEGORY_ALREADY_ACTIVE]: {
    en: 'Category is already active',
    ar: 'الفئة مفعّلة بالفعل',
  },
  [CATEGORY_ERROR_CODES.CATEGORY_ALREADY_INACTIVE]: {
    en: 'Category is already inactive',
    ar: 'الفئة غير مفعّلة بالفعل',
  },
};
