import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  GatewayResult,
  InvalidWebhookSignatureError,
} from './gateway/payment-gateway';
import { paymentGatewayConfig } from './gateway/payment-gateway.config';
import { PaymentGatewayRegistry } from './gateway/payment-gateway.registry';
import { renderMockCheckoutPage } from './gateway/mock-checkout.page';
import { MOCK_SIGNATURE_HEADER } from './gateway/mock.gateway';
import { PaymentCheckoutService } from './payment-checkout.service';

/**
 * S4-10: gateway webhooks, plus the mock gateway's hosted checkout page.
 * Responses are written explicitly: gateways only read the status code.
 */
@ApiExcludeController()
@Controller('payments')
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(
    private readonly gateways: PaymentGatewayRegistry,
    private readonly checkout: PaymentCheckoutService,
  ) {}

  @Post('webhooks/:gateway')
  async webhook(
    @Param('gateway') name: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const gateway = this.gateways.byName(name);
    if (!gateway) {
      res.status(404).json({ received: false });
      return;
    }
    let result: GatewayResult;
    try {
      result = gateway.parseWebhook({ headers, body });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        this.logger.warn(`Rejected ${name} webhook: bad signature`);
        res.status(401).json({ received: false });
        return;
      }
      throw error;
    }
    await this.checkout.applyGatewayResult(result);
    res.status(200).json({ received: true });
  }

  @Get('mock/checkout/:reference')
  async mockCheckoutPage(
    @Param('reference') reference: string,
    @Res() res: Response,
  ): Promise<void> {
    const view = paymentGatewayConfig.isMock
      ? await this.checkout.mockCheckout(reference)
      : null;
    if (!view) {
      res.status(404).send('Not found');
      return;
    }
    res.status(200).type('html').send(renderMockCheckoutPage(view));
  }

  /** Pay / Fail on the mock page: a signed webhook, then back to the web. */
  @Post('mock/checkout/:reference')
  async mockCheckoutDecision(
    @Param('reference') reference: string,
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const returnUrl = paymentGatewayConfig.isMock
      ? await this.checkout.returnUrlFor(reference)
      : null;
    if (!returnUrl) {
      res.status(404).send('Not found');
      return;
    }
    const outcome = body.outcome === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED';
    const mock = this.gateways.mock;
    const result = mock.parseWebhook({
      headers: {
        [MOCK_SIGNATURE_HEADER]: mock.sign({ reference, outcome }),
      },
      body: { reference, outcome },
    });
    await this.checkout.applyGatewayResult(result);
    res.redirect(303, returnUrl);
  }
}
