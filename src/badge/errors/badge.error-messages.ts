import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { BADGE_ERROR_CODES } from './badge.error-codes';

export const BADGE_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [BADGE_ERROR_CODES.BOUNDS_REQUIRED]: {
    en: 'Please choose both the maximum and the minimum for every enabled badge',
    ar: 'يرجى اختيار الحد الأعلى والحد الأدنى لكل وسام مفعّل',
  },
  [BADGE_ERROR_CODES.MIN_ABOVE_MAX]: {
    en: 'The minimum must not be higher than the maximum',
    ar: 'يجب ألا يكون الحد الأدنى أعلى من الحد الأعلى',
  },
  [BADGE_ERROR_CODES.TIERS_OVERLAP]: {
    en: 'The ranges of enabled badges must not overlap',
    ar: 'يجب ألا تتداخل نطاقات الأوسمة المفعّلة',
  },
  [BADGE_ERROR_CODES.DUPLICATE_TIER]: {
    en: 'Each badge can only be sent once',
    ar: 'لا يمكن إرسال الوسام نفسه أكثر من مرة',
  },
  [BADGE_ERROR_CODES.INVALID_MAX]: {
    en: '"Zero stars" can only be used as a minimum',
    ar: 'لا يمكن استخدام "صفر نجوم" إلا كحد أدنى',
  },
  [BADGE_ERROR_CODES.RUN_EXISTS]: {
    en: 'Badges have already been assigned for this month',
    ar: 'تم توزيع الأوسمة لهذا الشهر بالفعل',
  },
};
