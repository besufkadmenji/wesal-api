import { allowedPaymentMethods } from './payment-methods';
import { CheckoutPurpose } from './enums/checkout-purpose.enum';
import { PaymentMethod } from './enums/payment-method.enum';

const limits = (overrides = {}) => ({
  tabbyMinAmount: null,
  tabbyMaxAmount: null,
  tamaraMinAmount: null,
  tamaraMaxAmount: null,
  ...overrides,
});

describe('allowedPaymentMethods', () => {
  it('offers card, Tabby and Tamara for a contract with no bounds set', () => {
    expect(
      allowedPaymentMethods(CheckoutPurpose.CONTRACT, 500, limits()),
    ).toEqual([
      PaymentMethod.ELECTRONIC,
      PaymentMethod.TABBY,
      PaymentMethod.TAMARA,
    ]);
  });

  it('hides an installment provider outside its inclusive bounds', () => {
    const bounds = limits({
      tabbyMinAmount: '100.00',
      tabbyMaxAmount: '500.00',
      tamaraMaxAmount: 499.99,
    });
    expect(
      allowedPaymentMethods(CheckoutPurpose.CONTRACT, 500, bounds),
    ).toEqual([PaymentMethod.ELECTRONIC, PaymentMethod.TABBY]);
    expect(allowedPaymentMethods(CheckoutPurpose.CONTRACT, 99, bounds)).toEqual(
      [PaymentMethod.ELECTRONIC, PaymentMethod.TAMARA],
    );
  });

  it('keeps chat and premium-ad fees on card only', () => {
    for (const purpose of [
      CheckoutPurpose.CHAT_FEE,
      CheckoutPurpose.PREMIUM_AD,
    ]) {
      expect(allowedPaymentMethods(purpose, 50, limits())).toEqual([
        PaymentMethod.ELECTRONIC,
      ]);
    }
  });
});
