import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PaymentGateway } from './payment-gateway';
import { MockPaymentGateway } from './mock.gateway';
import { paymentGatewayConfig } from './payment-gateway.config';
import { PaymentMethod } from '../enums/payment-method.enum';

/**
 * Picks the adapter for a payment method. Today every method goes to the
 * mock; S4-7/8/9 register the card, Tabby and Tamara adapters here.
 */
@Injectable()
export class PaymentGatewayRegistry implements OnModuleInit {
  private readonly logger = new Logger(PaymentGatewayRegistry.name);
  readonly mock = new MockPaymentGateway();

  onModuleInit(): void {
    if (paymentGatewayConfig.isMock && process.env.NODE_ENV === 'production') {
      this.logger.warn(
        'PAYMENT_GATEWAY is mock: payments complete without moving money.',
      );
    }
  }

  /** Null when no adapter handles the method (checkout then fails). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  forMethod(_method: PaymentMethod): PaymentGateway | null {
    return paymentGatewayConfig.isMock ? this.mock : null;
  }

  /** Resolves `/payments/webhooks/:gateway`; null for an unknown name. */
  byName(name: string): PaymentGateway | null {
    return name.toLowerCase() === 'mock' && paymentGatewayConfig.isMock
      ? this.mock
      : null;
  }
}
