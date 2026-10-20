import type { MockCheckoutView } from '../payment-checkout.service';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentPurpose } from '../enums/payment-purpose.enum';

const COPY = {
  ar: {
    title: 'بوابة الدفع التجريبية',
    note: 'صفحة اختبار: لن يتم خصم أي مبلغ.',
    amount: 'المبلغ',
    method: 'طريقة الدفع',
    purpose: 'مقابل',
    pay: 'ادفع',
    fail: 'فشل الدفع',
    currency: 'ر.س',
    methods: {
      [PaymentMethod.ELECTRONIC]: 'الدفع الإلكتروني',
      [PaymentMethod.TABBY]: 'تابي',
      [PaymentMethod.TAMARA]: 'تمارا',
    } as Record<string, string>,
    purposes: {
      [PaymentPurpose.CONTRACT]: 'قيمة التعاقد',
      [PaymentPurpose.CHAT_CUSTOMER]: 'رسوم المحادثة',
      [PaymentPurpose.CHAT_PROVIDER]: 'رسوم المحادثة',
      [PaymentPurpose.PREMIUM_AD]: 'إعلان مميز',
    } as Record<string, string>,
  },
  en: {
    title: 'Test payment gateway',
    note: 'Test page: no money is charged.',
    amount: 'Amount',
    method: 'Method',
    purpose: 'For',
    pay: 'Pay',
    fail: 'Fail payment',
    currency: 'SAR',
    methods: {
      [PaymentMethod.ELECTRONIC]: 'Card payment',
      [PaymentMethod.TABBY]: 'Tabby',
      [PaymentMethod.TAMARA]: 'Tamara',
    } as Record<string, string>,
    purposes: {
      [PaymentPurpose.CONTRACT]: 'Contract value',
      [PaymentPurpose.CHAT_CUSTOMER]: 'Chat fee',
      [PaymentPurpose.CHAT_PROVIDER]: 'Chat fee',
      [PaymentPurpose.PREMIUM_AD]: 'Featured ad',
    } as Record<string, string>,
  },
};

function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}

/** The mock gateway's hosted page (S4-10): Pay or Fail, then back to Wesal. */
export function renderMockCheckoutPage(view: MockCheckoutView): string {
  const t = COPY[view.language];
  const dir = view.language === 'ar' ? 'rtl' : 'ltr';
  const action = `/payments/mock/checkout/${encodeURIComponent(view.reference)}`;
  const button = (outcome: string, label: string, primary: boolean) =>
    `<form method="post" action="${escape(action)}"><input type="hidden" name="outcome" value="${outcome}"><button class="${primary ? 'pay' : 'fail'}" type="submit">${escape(label)}</button></form>`;
  return `<!doctype html>
<html lang="${view.language}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(t.title)}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f3f4f6; font-family: system-ui, sans-serif; color: #111827; }
  main { width: min(420px, calc(100% - 32px)); background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .note { margin: 0 0 20px; color: #b45309; font-size: 14px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; margin: 0 0 24px; }
  dt { color: #6b7280; } dd { margin: 0; font-weight: 600; }
  .actions { display: grid; gap: 12px; }
  button { width: 100%; border: 0; border-radius: 10px; padding: 12px; font-size: 16px; cursor: pointer; }
  .pay { background: #0f766e; color: #fff; } .fail { background: #fee2e2; color: #b91c1c; }
</style>
</head>
<body>
<main>
  <h1>${escape(t.title)}</h1>
  <p class="note">${escape(t.note)}</p>
  <dl>
    <dt>${escape(t.purpose)}</dt><dd>${escape(t.purposes[view.purpose] ?? view.purpose)}</dd>
    <dt>${escape(t.method)}</dt><dd>${escape(t.methods[view.method] ?? view.method)}</dd>
    <dt>${escape(t.amount)}</dt><dd>${view.amount.toFixed(2)} ${escape(t.currency)}</dd>
  </dl>
  <div class="actions">
    ${button('SUCCEEDED', t.pay, true)}
    ${button('FAILED', t.fail, false)}
  </div>
</main>
</body>
</html>`;
}
