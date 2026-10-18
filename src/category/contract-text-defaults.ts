/**
 * BRD 4.3.8 default contract texts for new categories. Admins can edit them
 * per category. The undertaking uses `{commission}` and `{minimum}`
 * placeholders, which the contract snapshot fills with the category values.
 */
export const CONTRACT_TEXT_PLACEHOLDERS = {
  commission: '{commission}',
  minimum: '{minimum}',
} as const;

/** Binding text for both parties (single bilingual field). */
export const DEFAULT_CONTRACT_DOCUMENT_TEXT = [
  'لا يعتبر أي تعاقد بين الطرفين سارياً إلا بعد سداد قيمة التعاقد عن طريق بوابة الدفع في المنصة، ويُمنع تنفيذ التعاقد خارج النظام دون سداد العمولة.',
  'No contract between the parties is valid until the contract value is paid through the platform payment gateway. Executing the contract outside the system without paying the commission is prohibited.',
].join('\n\n');

export const DEFAULT_UNDERTAKING_TEXT_AR =
  'أوافق وألتزم بأن تُحتسب عمولة المنصة ({commission}%) من قيمة التعاقد، وأن العمولات التي تساوي أو تقل عن ({minimum}) ريال تُخصّص صدقةً عبر وصال الخير.';

export const DEFAULT_UNDERTAKING_TEXT_EN =
  'I agree that the platform commission ({commission}%) is calculated on the contract value, and that commissions equal to or below SAR {minimum} are given as charity through Wesal Al-Khair.';

export const DEFAULT_REFUND_POLICY_AR = [
  '1. إلغاء العميل للتعاقد أثناء التنفيذ: يُعاد للعميل المبلغ المدفوع مخصوماً منه العربون، ويحصل مقدم الخدمة على العربون مخصوماً منه العمولة.',
  '2. تجاوز مقدم الخدمة مدة التنفيذ المتفق عليها: يُعاد للعميل كامل المبلغ بما في ذلك العربون، ولا يستحق مقدم الخدمة أي مبلغ.',
  '3. رفض العميل استلام الخدمة: يتم تعليق المبلغ حتى تبت الإدارة في الحالة.',
].join('\n');

export const DEFAULT_REFUND_POLICY_EN = [
  '1. Customer cancels during execution: the customer is refunded the amount paid minus the deposit, and the provider receives the deposit minus the commission.',
  '2. Provider exceeds the agreed execution time: the customer is refunded the full amount including the deposit, and the provider receives nothing.',
  '3. Customer refuses to receive the service: the amount is held until the administration resolves the case.',
].join('\n');

/** Fills the undertaking placeholders with the contract's commission terms. */
export const renderUndertaking = (
  text: string,
  commissionPercent: number,
  minimumAmount: number,
): string =>
  text
    .split(CONTRACT_TEXT_PLACEHOLDERS.commission)
    .join(String(Number(commissionPercent)))
    .split(CONTRACT_TEXT_PLACEHOLDERS.minimum)
    .join(String(Number(minimumAmount)));
