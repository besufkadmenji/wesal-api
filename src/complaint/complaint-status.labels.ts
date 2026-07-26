import type { TranslatedError } from '../../../lib/i18n/i18n.service';
import { ComplaintStatus } from './enums/complaint-status.enum';

export const COMPLAINT_STATUS_LABELS: Record<
  ComplaintStatus,
  TranslatedError
> = {
  [ComplaintStatus.PENDING]: {
    en: 'Pending',
    ar: 'قيد الانتظار',
  },
  [ComplaintStatus.UNDER_REVIEW]: {
    en: 'Under review',
    ar: 'قيد المراجعة',
  },
  [ComplaintStatus.RESOLVED]: {
    en: 'Resolved',
    ar: 'تم الحل',
  },
  [ComplaintStatus.REJECTED]: {
    en: 'Rejected',
    ar: 'مرفوض',
  },
  [ComplaintStatus.CLOSED]: {
    en: 'Closed',
    ar: 'مغلق',
  },
};
