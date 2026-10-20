import { PaymentMethod } from './enums/payment-method.enum';
import { CheckoutPurpose } from './enums/checkout-purpose.enum';
import type { Setting } from '../setting/entities/setting.entity';

type Limits = Pick<
  Setting,
  'tabbyMinAmount' | 'tabbyMaxAmount' | 'tamaraMinAmount' | 'tamaraMaxAmount'
>;

function within(
  amount: number,
  min: number | string | null,
  max: number | string | null,
) {
  return (
    (min == null || amount >= Number(min)) &&
    (max == null || amount <= Number(max))
  );
}

/**
 * BRD 4.1.17: a contract is paid in full by card, or in installments with
 * Tabby or Tamara inside the admin's bounds. Chat and premium-ad fees are
 * card only (decision 2026-10-20).
 */
export function allowedPaymentMethods(
  purpose: CheckoutPurpose,
  amount: number,
  limits: Limits,
): PaymentMethod[] {
  if (purpose !== CheckoutPurpose.CONTRACT) return [PaymentMethod.ELECTRONIC];
  const methods = [PaymentMethod.ELECTRONIC];
  if (within(amount, limits.tabbyMinAmount, limits.tabbyMaxAmount)) {
    methods.push(PaymentMethod.TABBY);
  }
  if (within(amount, limits.tamaraMinAmount, limits.tamaraMaxAmount)) {
    methods.push(PaymentMethod.TAMARA);
  }
  return methods;
}
