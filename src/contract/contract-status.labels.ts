import type { TranslatedError } from '../../../lib/i18n/i18n.service';
import { ContractStatus } from './enums/contract-status.enum';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, TranslatedError> = {
  [ContractStatus.DRAFT]: {
    en: 'Draft',
    ar: 'مسودة',
  },
  [ContractStatus.PENDING]: {
    en: 'Pending',
    ar: 'قيد الانتظار',
  },
  [ContractStatus.ACCEPTED]: {
    en: 'Accepted',
    ar: 'مقبول',
  },
  [ContractStatus.REJECTED]: {
    en: 'Rejected',
    ar: 'مرفوض',
  },
  [ContractStatus.IN_PROGRESS]: {
    en: 'In progress',
    ar: 'قيد التنفيذ',
  },
  [ContractStatus.AWAITING_CUSTOMER_CONFIRMATION]: {
    en: 'Awaiting customer confirmation',
    ar: 'بانتظار تأكيد العميل',
  },
  [ContractStatus.DELIVERY_IN_PROGRESS]: {
    en: 'Delivery in progress',
    ar: 'جاري التوصيل',
  },
  [ContractStatus.CANCELLATION_REQUESTED]: {
    en: 'Cancellation requested',
    ar: 'تم طلب الإلغاء',
  },
  [ContractStatus.DISPUTED]: {
    en: 'Disputed',
    ar: 'متنازع عليه',
  },
  [ContractStatus.COMPLETED]: {
    en: 'Completed',
    ar: 'مكتمل',
  },
  [ContractStatus.CANCELLED]: {
    en: 'Cancelled',
    ar: 'ملغي',
  },
};
