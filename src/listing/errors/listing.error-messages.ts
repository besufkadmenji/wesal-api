import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { LISTING_ERROR_CODES, ListingErrorCode } from './listing.error-codes';

export const LISTING_ERROR_MESSAGES: Record<ListingErrorCode, TranslatedError> =
  {
    [LISTING_ERROR_CODES.LISTING_NOT_FOUND]: {
      en: 'Listing not found',
      ar: 'الإعلان غير موجود',
    },
    [LISTING_ERROR_CODES.CATEGORY_NOT_FOUND]: {
      en: 'Category not found',
      ar: 'الفئة غير موجودة',
    },
    [LISTING_ERROR_CODES.CITY_NOT_FOUND]: {
      en: 'City not found',
      ar: 'المدينة غير موجودة',
    },
    [LISTING_ERROR_CODES.UNAUTHORIZED]: {
      en: 'You are not authorized to perform this action',
      ar: 'أنت غير مصرح بإجراء هذا الإجراء',
    },
    [LISTING_ERROR_CODES.INVALID_STATUS]: {
      en: 'Invalid listing status',
      ar: 'حالة الإعلان غير صحيحة',
    },
    [LISTING_ERROR_CODES.PROVIDER_ONLY]: {
      en: 'Only providers can create listings',
      ar: 'فقط مقدمو الخدمات يمكنهم إنشاء إعلانات',
    },
    [LISTING_ERROR_CODES.PROVIDER_NOT_ACTIVE]: {
      en: 'Provider account must be active',
      ar: 'يجب أن يكون حساب مقدم الخدمة نشطاً',
    },
    [LISTING_ERROR_CODES.ACTIVE_CONTRACT_REQUIRED]: {
      en: 'An active platform contract is required',
      ar: 'يلزم وجود عقد نشط مع المنصة',
    },
    [LISTING_ERROR_CODES.LISTING_DELETED]: {
      en: 'Listing deleted successfully',
      ar: 'تم حذف الإعلان',
    },
    [LISTING_ERROR_CODES.LISTING_ALREADY_ACTIVE]: {
      en: 'Listing is already active',
      ar: 'الإعلان نشط بالفعل',
    },
    [LISTING_ERROR_CODES.LISTING_ALREADY_INACTIVE]: {
      en: 'Listing is already inactive',
      ar: 'الإعلان غير نشط بالفعل',
    },
    [LISTING_ERROR_CODES.LISTING_HAS_COMPLAINTS]: {
      en: 'Cannot delete listing that has complaints',
      ar: 'لا يمكن حذف إعلان لديه شكاوى',
    },
    [LISTING_ERROR_CODES.LISTING_HAS_CONVERSATIONS]: {
      en: 'Cannot delete listing that has conversations',
      ar: 'لا يمكن حذف إعلان لديه محادثات',
    },
    [LISTING_ERROR_CODES.LISTING_HAS_FAVORITES]: {
      en: 'Cannot delete listing that has been saved by users',
      ar: 'لا يمكن حذف إعلان تم حفظه من قبل مستخدمين',
    },
    [LISTING_ERROR_CODES.LISTING_HAS_RATINGS]: {
      en: 'Cannot delete listing that has ratings',
      ar: 'لا يمكن حذف إعلان لديه تقييمات',
    },
  };
