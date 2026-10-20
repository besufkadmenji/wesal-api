import { createHmac, timingSafeEqual } from 'crypto';
import {
  CheckoutRequest,
  GatewayOutcome,
  GatewayResult,
  InvalidWebhookSignatureError,
  PaymentGateway,
  WebhookRequest,
} from './payment-gateway';
import { paymentGatewayConfig } from './payment-gateway.config';

export const MOCK_SIGNATURE_HEADER = 'x-mock-signature';

export interface MockWebhookBody {
  reference: string;
  outcome: GatewayOutcome;
}

/**
 * Behaves like a hosted gateway: the customer is sent to a checkout page
 * (served by PaymentGatewayController) whose Pay / Fail buttons post a
 * signed webhook, then return to the web. No money moves.
 */
export class MockPaymentGateway implements PaymentGateway {
  readonly name = 'MOCK';

  createCheckout(request: CheckoutRequest): Promise<{ redirectUrl: string }> {
    const reference = encodeURIComponent(request.reference);
    return Promise.resolve({
      redirectUrl: `${paymentGatewayConfig.apiPublicUrl}/payments/mock/checkout/${reference}`,
    });
  }

  sign(body: MockWebhookBody): string {
    return createHmac('sha256', paymentGatewayConfig.mockSecret)
      .update(`${body.reference}:${body.outcome}`)
      .digest('hex');
  }

  parseWebhook(request: WebhookRequest): GatewayResult {
    const body = (request.body ?? {}) as Partial<MockWebhookBody>;
    const header = request.headers[MOCK_SIGNATURE_HEADER];
    const signature = Array.isArray(header) ? header[0] : header;
    if (
      typeof body.reference !== 'string' ||
      (body.outcome !== 'SUCCEEDED' && body.outcome !== 'FAILED') ||
      typeof signature !== 'string'
    ) {
      throw new InvalidWebhookSignatureError();
    }
    const expected = Buffer.from(
      this.sign({ reference: body.reference, outcome: body.outcome }),
    );
    const actual = Buffer.from(signature);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new InvalidWebhookSignatureError();
    }
    return {
      reference: body.reference,
      outcome: body.outcome,
      failureReason:
        body.outcome === 'FAILED' ? 'Declined on the mock checkout' : null,
      raw: { gateway: 'mock', ...body },
    };
  }

  refund(): Promise<void> {
    return Promise.reject(new Error('Gateway refunds arrive with S4-13'));
  }
}
