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
  CATEGORY_HAS_PROVIDERS: {
    en: 'This category cannot be deactivated while service providers are linked to it',
    ar: 'لا يمكن تعطيل القسم لارتباطه بمقدمي خدمة',
  },
  CATEGORY_HAS_OPEN_CONTRACTS: {
    en: 'This category has unfinished contracts and cannot be deactivated or deleted until they end',
    ar: 'لا يمكن تعطيل أو حذف القسم لوجود تعاقدات غير منتهية مرتبطة به',
  },
  CONTRACT_VALUE_REQUIRED: {
    en: 'Every enabled contract setting needs a whole-number value (at least 1; the minimum commission may be 0)',
    ar: 'يجب إدخال قيمة صحيحة لكل إعداد تعاقد مفعّل (لا تقل عن 1، ويمكن أن يكون الحد الأدنى للعمولة 0)',
  },
  CONTRACT_TEXT_REQUIRED: {
    en: 'Every enabled contract text must be filled in',
    ar: 'يجب تعبئة جميع نصوص التعاقد المفعّلة',
  },
};
