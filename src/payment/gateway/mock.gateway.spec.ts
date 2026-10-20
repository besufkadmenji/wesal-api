import { MockPaymentGateway, MOCK_SIGNATURE_HEADER } from './mock.gateway';
import { InvalidWebhookSignatureError } from './payment-gateway';
import { PaymentMethod } from '../enums/payment-method.enum';

describe('MockPaymentGateway', () => {
  const gateway = new MockPaymentGateway();
  const body = { reference: 'ref-1', outcome: 'SUCCEEDED' as const };

  it('redirects to its hosted checkout page on this API', async () => {
    process.env.API_PUBLIC_URL = 'https://api.example.test/';
    try {
      await expect(
        gateway.createCheckout({
          reference: 'ref 1',
          amount: 10,
          currency: 'SAR',
          method: PaymentMethod.ELECTRONIC,
          description: 'x',
          returnUrl: 'https://web/x',
          language: 'en',
        }),
      ).resolves.toEqual({
        redirectUrl: 'https://api.example.test/payments/mock/checkout/ref%201',
      });
    } finally {
      delete process.env.API_PUBLIC_URL;
    }
  });

  it('accepts a correctly signed webhook', () => {
    const result = gateway.parseWebhook({
      headers: { [MOCK_SIGNATURE_HEADER]: gateway.sign(body) },
      body,
    });
    expect(result).toMatchObject({ reference: 'ref-1', outcome: 'SUCCEEDED' });
  });

  it('rejects a tampered outcome, a missing signature or another secret', () => {
    const signature = gateway.sign(body);
    expect(() =>
      gateway.parseWebhook({
        headers: { [MOCK_SIGNATURE_HEADER]: signature },
        body: { ...body, outcome: 'FAILED' },
      }),
    ).toThrow(InvalidWebhookSignatureError);
    expect(() => gateway.parseWebhook({ headers: {}, body })).toThrow(
      InvalidWebhookSignatureError,
    );
    process.env.PAYMENT_MOCK_SECRET = 'another-secret';
    try {
      expect(() =>
        gateway.parseWebhook({
          headers: { [MOCK_SIGNATURE_HEADER]: signature },
          body,
        }),
      ).toThrow(InvalidWebhookSignatureError);
    } finally {
      delete process.env.PAYMENT_MOCK_SECRET;
    }
  });
});
