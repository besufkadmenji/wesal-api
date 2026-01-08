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
};