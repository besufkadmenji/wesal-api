/**
 * S4-38 / D-11: every customer/provider notification is written in both
 * languages; the API returns the reader's language at read time.
 */
export type LocalizedText = { title: string; message: string };
export type BilingualText = { ar: LocalizedText; en: LocalizedText };

const sar = (amount: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    Number(amount),
  );

export const notificationTexts = {
  // S4-58: the admin rejected the provider's e-contract termination request.
  eContractTerminationRejected: (reason: string): BilingualText => ({
    ar: {
      title: 'تم رفض طلب فسخ العقد',
      message: `رفضت الإدارة طلب فسخ العقد الإلكتروني. السبب: ${reason}`,
    },
    en: {
      title: 'Termination request rejected',
      message: `The administration rejected your e-contract termination request. Reason: ${reason}`,
    },
  }),
  contractStatus: (
    reference: string | number,
    status: { ar: string; en: string },
  ): BilingualText => ({
    ar: {
      title: 'تحديث التعاقد',
      message: `تم تحديث حالة التعاقد رقم ${reference} إلى ${status.ar}`,
    },
    en: {
      title: 'Contract update',
      message: `Contract ${reference} is now ${status.en}`,
    },
  }),
  contractPaidCustomer: (reference: string | number): BilingualText => ({
    ar: {
      title: 'تم تحديث حالة الطلب',
      message: `تم سداد التعاقد رقم ${reference}، وطلبك الآن "قيد التنفيذ".`,
    },
    en: {
      title: 'Order status updated',
      message: `Contract ${reference} is paid and your order is now "In progress".`,
    },
  }),
  contractPaidProvider: (reference: string | number): BilingualText => ({
    ar: {
      title: 'تم سداد قيمة التعاقد',
      message: `تم سداد قيمة التعاقد رقم ${reference}، يرجى البدء في التنفيذ.`,
    },
    en: {
      title: 'Contract paid',
      message: `Contract ${reference} has been paid. Please start the work.`,
    },
  }),
  payout: (reference: string | number, amount: number): BilingualText => ({
    ar: {
      title: 'تحويل قيمة التعاقد',
      message: `تم تحويل قيمة التعاقد رقم (${reference}) من المنصة، المبلغ (${sar(amount)}) ريال.`,
    },
    en: {
      title: 'Payout transferred',
      message: `The platform transferred the value of contract #${reference}: SAR ${sar(amount)}.`,
    },
  }),
  refund: (reference: string | number, amount: number): BilingualText => ({
    ar: {
      title: 'استرداد مبلغ',
      message: `تم استرداد مبلغ (${sar(amount)}) ريال من التعاقد رقم (${reference}).`,
    },
    en: {
      title: 'Refund issued',
      message: `SAR ${sar(amount)} from contract #${reference} has been refunded to you.`,
    },
  }),
  /** S4-2: BRD 4.1.16 / 4.2.18 overdue pop-up text. */
  contractOverdue: (reference: string | number): BilingualText => ({
    ar: {
      title: 'لديك تعاقد يحتاج إلى توقيع وإنهاء',
      message: `التعاقد رقم ${reference} تجاوز المدة المحددة، يرجى التوقيع وإنهاء التعاقد.`,
    },
    en: {
      title: 'You have a contract that needs to be signed and finalized',
      message: `Contract ${reference} is past its deadline. Please sign and complete it.`,
    },
  }),
  contractExpired: (reference: string | number): BilingualText => ({
    ar: {
      title: 'انتهت مهلة التعاقد',
      message: `تم إلغاء التعاقد رقم ${reference} لانتهاء مدة المحادثة قبل سداده.`,
    },
    en: {
      title: 'Contract expired',
      message: `Contract ${reference} was cancelled because the chat ended before it was paid.`,
    },
  }),
  chatFeePaid: (listingName: string): BilingualText => ({
    ar: {
      title: 'تم دفع رسوم المحادثة',
      message: `تم دفع رسوم المحادثة بنجاح لإعلان "${listingName}".`,
    },
    en: {
      title: 'Chat fee paid',
      message: `The chat fee for "${listingName}" was paid successfully.`,
    },
  }),
  chatStarted: (listingName: string): BilingualText => ({
    ar: {
      title: 'محادثة جديدة',
      message: `بدأ عميل محادثة جديدة حول إعلان "${listingName}".`,
    },
    en: {
      title: 'New conversation',
      message: `A customer started a conversation about "${listingName}".`,
    },
  }),
  chatEnded: (listingName: string): BilingualText => ({
    ar: {
      title: 'انتهت المحادثة',
      message: `انتهت مدة المحادثة الخاصة بإعلان "${listingName}".`,
    },
    en: {
      title: 'Conversation ended',
      message: `The conversation about "${listingName}" has ended.`,
    },
  }),
  listingFeatured: (listingName: string): BilingualText => ({
    ar: {
      title: 'تم تمييز إعلانك',
      message: `تم دفع رسوم الإعلان المميز وأصبح إعلان "${listingName}" مميزاً.`,
    },
    en: {
      title: 'Listing featured',
      message: `The featured-ad fee was paid and "${listingName}" is now featured.`,
    },
  }),
  listingFeaturedExpired: (listingName: string): BilingualText => ({
    ar: {
      title: 'انتهى تمييز الإعلان',
      message: `انتهت مدة تمييز إعلان "${listingName}".`,
    },
    en: {
      title: 'Featured period ended',
      message: `The featured period for "${listingName}" has ended.`,
    },
  }),
  newRating: (reference: string | number, rating: number): BilingualText => ({
    ar: {
      title: 'تقييم جديد',
      message: `تم تقييم التعاقد رقم ${reference} بـ ${rating} من 5`,
    },
    en: {
      title: 'New rating',
      message: `Contract ${reference} was rated ${rating} out of 5`,
    },
  }),
  complaintReply: (): BilingualText => ({
    ar: { title: 'رد على الشكوى', message: 'ردت الإدارة على شكواك.' },
    en: {
      title: 'Complaint response',
      message: 'The administration replied to your complaint.',
    },
  }),
  complaintStatus: (status: { ar: string; en: string }): BilingualText => ({
    ar: {
      title: 'تم تحديث حالة الشكوى',
      message: `أصبحت حالة شكواك الآن ${status.ar}.`,
    },
    en: {
      title: 'Complaint status updated',
      message: `Your complaint status is now ${status.en}.`,
    },
  }),
  categoryStatus: (
    name: { ar: string; en: string },
    active: boolean,
  ): BilingualText => ({
    ar: {
      title: active ? 'تفعيل قسم' : 'تعطيل قسم',
      message: `تم ${active ? 'تفعيل' : 'تعطيل'} القسم "${name.ar}".`,
    },
    en: {
      title: active ? 'Category activated' : 'Category deactivated',
      message: `The category "${name.en}" has been ${active ? 'activated' : 'deactivated'}.`,
    },
  }),
};

/** The stored text in the reader's language (old rows: as stored). */
export const localizedNotificationField = (
  notification: {
    title: string;
    message: string;
    translations?: Partial<Record<'ar' | 'en', LocalizedText>> | null;
  },
  field: 'title' | 'message',
  language: 'ar' | 'en',
): string =>
  notification.translations?.[language]?.[field] ?? notification[field];
