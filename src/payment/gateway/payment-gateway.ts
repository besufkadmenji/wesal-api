import type { PaymentMethod } from '../enums/payment-method.enum';
import type { LanguageCode } from '../../../lib/i18n/language.types';

export type GatewayOutcome = 'SUCCEEDED' | 'FAILED';

export interface CheckoutRequest {
  /** Our attempt id; the gateway echoes it back in its webhook. */
  reference: string;
  amount: number;
  currency: 'SAR';
  method: PaymentMethod;
  description: string;
  /** Where the gateway sends the customer when checkout ends. */
  returnUrl: string;
  language: LanguageCode;
}

export interface GatewayResult {
  reference: string;
  outcome: GatewayOutcome;
  failureReason?: string | null;
  raw: Record<string, unknown>;
}

export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

/**
 * S4-6: one adapter per payment provider (card gateway, Tabby, Tamara). Only
 * the mock exists until the PO supplies merchant credentials (D-2).
 */
export interface PaymentGateway {
  /** Stored on the payment row, e.g. MOCK. */
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<{ redirectUrl: string }>;
  /** Verifies the webhook's signature; throws InvalidWebhookSignatureError. */
  parseWebhook(request: WebhookRequest): GatewayResult;
  /** S4-13 executes refunds through the gateway. */
  refund(reference: string, amount: number): Promise<void>;
}

export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super('Invalid payment webhook signature');
  }
}
