import { randomUUID } from 'crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Category } from '../category/entities/category.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { Conversation } from '../conversation/entities/conversation.entity';
import { ConversationStatus } from '../conversation/enums/conversation-status.enum';
import { Listing } from '../listing/entities/listing.entity';
import { PromotionStatus } from '../listing/enums/listing.enum';
import { AdminNotificationService } from '../notification/admin-notification.service';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { SettingService } from '../setting/setting.service';
import { PaymentCheckout } from './dto/payment-checkout.response';
import { StartPaymentCheckoutInput } from './dto/start-payment-checkout.input';
import { Payment } from './entities/payment.entity';
import { CheckoutPurpose } from './enums/checkout-purpose.enum';
import { PayerType } from './enums/payer-type.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentPurpose } from './enums/payment-purpose.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PAYMENT_ERROR_CODES } from './errors/payment.error-codes';
import { PAYMENT_ERROR_MESSAGES } from './errors/payment.error-messages';
import type { GatewayResult } from './gateway/payment-gateway';
import { paymentGatewayConfig } from './gateway/payment-gateway.config';
import { PaymentGatewayRegistry } from './gateway/payment-gateway.registry';
import { allowedPaymentMethods } from './payment-methods';
import { isCategoryActive } from '../category/category-active';
import { PaymentService } from './payment.service';

/** What a checkout charges, before the payment row is written. */
interface Obligation {
  purpose: PaymentPurpose;
  payerType: PayerType;
  targetKey: string;
  amount: number;
  contractId?: string | null;
  conversationId?: string | null;
  listingId?: string | null;
  categoryId?: string | null;
  commissionPercent?: number;
  commissionAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  configSnapshot: Record<string, unknown>;
  description: string;
}

export interface MockCheckoutView {
  reference: string;
  amount: number;
  method: PaymentMethod;
  purpose: PaymentPurpose;
  language: LanguageCode;
}

/**
 * S4-10: every payment (contract, chat fee, premium ad) starts a gateway
 * checkout and completes only when the gateway's signed webhook confirms it.
 */
@Injectable()
export class PaymentCheckoutService {
  private readonly logger = new Logger(PaymentCheckoutService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly gateways: PaymentGatewayRegistry,
    private readonly paymentService: PaymentService,
    private readonly settingService: SettingService,
    @Optional()
    private readonly adminNotifications?: AdminNotificationService,
  ) {}

  /** Methods the customer may pick for a contract (BNPL bounds applied). */
  async contractPaymentMethods(contract: Contract): Promise<PaymentMethod[]> {
    const setting = await this.settingService.getSetting();
    return allowedPaymentMethods(
      CheckoutPurpose.CONTRACT,
      Number(contract.totalPayable),
      setting,
    );
  }

  async startCheckout(
    input: StartPaymentCheckoutInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<PaymentCheckout> {
    const gateway = this.gateways.forMethod(input.method);
    if (!gateway) throw this.badRequest('GATEWAY_ERROR', language);
    const setting = await this.settingService.getSetting();

    const { payment, obligation } = await this.dataSource.transaction(
      async (manager) => {
        const obligation = await this.obligation(
          input,
          principal,
          manager,
          language,
        );
        const allowed = allowedPaymentMethods(
          input.purpose,
          obligation.amount,
          setting,
        );
        if (!allowed.includes(input.method)) {
          throw this.badRequest('METHOD_NOT_AVAILABLE', language);
        }
        const repository = manager.getRepository(Payment);
        const obligationKey = `${obligation.purpose}:${obligation.targetKey}:${obligation.payerType}:${principal.sub}`;
        const existing = await repository.findOne({
          where: { obligationKey },
          lock: { mode: 'pessimistic_write' },
        });
        if (existing?.status === PaymentStatus.COMPLETED) {
          throw this.badRequest('PAYMENT_ALREADY_COMPLETED', language);
        }
        const payment =
          existing ??
          repository.create({
            obligationKey,
            payerId: principal.sub,
            payerType: obligation.payerType,
            purpose: obligation.purpose,
          });
        Object.assign(payment, {
          contractId: obligation.contractId ?? null,
          conversationId: obligation.conversationId ?? null,
          listingId: obligation.listingId ?? null,
          categoryId: obligation.categoryId ?? null,
          amount: obligation.amount,
          commissionPercent: obligation.commissionPercent ?? 0,
          commissionAmount: obligation.commissionAmount ?? 0,
          vatRate: obligation.vatRate ?? 0,
          vatAmount: obligation.vatAmount ?? 0,
          configSnapshot: { ...obligation.configSnapshot, language },
          paymentMethod: input.method,
          status: PaymentStatus.PENDING,
          gateway: gateway.name,
          checkoutReference: randomUUID(),
          transactionReference: null,
          gatewayResponse: null,
          paidAt: null,
          failedAt: null,
          failureReason: null,
          notes: null,
        });
        return { payment: await repository.save(payment), obligation };
      },
    );

    try {
      const { redirectUrl } = await gateway.createCheckout({
        reference: payment.checkoutReference!,
        amount: Number(payment.amount),
        currency: 'SAR',
        method: input.method,
        description: obligation.description,
        returnUrl: this.returnUrl(payment.id, language),
        language,
      });
      return { paymentId: payment.id, redirectUrl };
    } catch (error) {
      this.logger.error(
        `Gateway ${gateway.name} refused checkout ${payment.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.dataSource.getRepository(Payment).update(payment.id, {
        status: PaymentStatus.FAILED,
        failedAt: new Date(),
        failureReason: 'Checkout could not be created',
      });
      throw this.badRequest('GATEWAY_ERROR', language);
    }
  }

  /**
   * Applies a verified gateway result once. Replays and results for an older
   * attempt change nothing; a result nobody can match is reported to admins,
   * since the customer may have been charged.
   */
  async applyGatewayResult(result: GatewayResult): Promise<Payment | null> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Payment);
      const payment = await repository.findOne({
        where: { checkoutReference: result.reference },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) return { payment: null, unmatched: true as const };
      if (payment.status !== PaymentStatus.PENDING) {
        return { payment, unmatched: false as const };
      }
      payment.transactionReference = result.reference;
      payment.gatewayResponse = JSON.stringify(result.raw);
      if (result.outcome === 'FAILED') {
        payment.status = PaymentStatus.FAILED;
        payment.failedAt = new Date();
        payment.failureReason = result.failureReason ?? null;
        return {
          payment: await repository.save(payment),
          unmatched: false as const,
        };
      }
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      const saved = await repository.save(payment);
      const fulfilment = await this.paymentService.fulfil(
        saved,
        manager,
        this.languageOf(saved),
      );
      if (!fulfilment.fulfilled) {
        saved.notes = 'Paid after the target closed; refund required.';
        await repository.save(saved);
      }
      return { payment: saved, unmatched: false as const, fulfilment };
    });

    if (outcome.unmatched) {
      this.logger.error(
        `Gateway result for unknown checkout ${result.reference} (${result.outcome})`,
      );
      if (result.outcome === 'SUCCEEDED') {
        await this.alertAdmins(
          `Checkout ${result.reference}`,
          'a payment that matches no open checkout',
          'دفعة لا تطابق أي عملية دفع مفتوحة',
          null,
        );
      }
      return null;
    }
    if (outcome.fulfilment) {
      if (outcome.fulfilment.fulfilled) {
        await outcome.fulfilment.after();
      } else {
        await this.alertAdmins(
          `Payment ${outcome.payment.publicId ?? outcome.payment.id}`,
          'a payment received after its contract, chat or ad closed',
          'دفعة وصلت بعد إغلاق العقد أو المحادثة أو الإعلان',
          outcome.payment,
        );
      }
    }
    return outcome.payment;
  }

  /** Mock gateway page data; null when unknown or already decided. */
  async mockCheckout(reference: string): Promise<MockCheckoutView | null> {
    const payment = await this.dataSource.getRepository(Payment).findOne({
      where: { checkoutReference: reference },
    });
    if (!payment) return null;
    return {
      reference,
      amount: Number(payment.amount),
      method: payment.paymentMethod,
      purpose: payment.purpose,
      language: this.languageOf(payment),
    };
  }

  /** Where the mock page returns to once the customer decides. */
  async returnUrlFor(reference: string): Promise<string | null> {
    const payment = await this.dataSource.getRepository(Payment).findOne({
      where: { checkoutReference: reference },
    });
    return payment
      ? this.returnUrl(payment.id, this.languageOf(payment))
      : null;
  }

  private returnUrl(paymentId: string, language: LanguageCode): string {
    return `${paymentGatewayConfig.webAppUrl}/${language}/payments/return?paymentId=${encodeURIComponent(paymentId)}`;
  }

  private languageOf(payment: Payment): LanguageCode {
    return payment.configSnapshot?.language === 'ar' ? 'ar' : 'en';
  }

  private async obligation(
    input: StartPaymentCheckoutInput,
    principal: JwtPayload,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<Obligation> {
    switch (input.purpose) {
      case CheckoutPurpose.CONTRACT:
        return this.contractObligation(
          input.targetId,
          principal,
          manager,
          language,
        );
      case CheckoutPurpose.CHAT_FEE:
        return this.chatFeeObligation(
          input.targetId,
          principal,
          manager,
          language,
        );
      case CheckoutPurpose.PREMIUM_AD:
        return this.premiumAdObligation(
          input.targetId,
          principal,
          manager,
          language,
        );
    }
  }

  private async contractObligation(
    contractId: string,
    principal: JwtPayload,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<Obligation> {
    const contract = await manager.getRepository(Contract).findOne({
      where: { id: contractId },
    });
    if (!contract) throw this.notFound('CONTRACT_NOT_FOUND', language);
    if (principal.type !== 'user' || contract.clientId !== principal.sub) {
      throw this.badRequest('UNAUTHORIZED_ACCESS', language);
    }
    const newer = await manager
      .getRepository(Contract)
      .count({ where: { supersedesContractId: contract.id } });
    if (contract.status !== ContractStatus.ACCEPTED || newer > 0) {
      throw this.badRequest('NOT_PAYABLE', language);
    }
    return {
      purpose: PaymentPurpose.CONTRACT,
      payerType: PayerType.USER,
      targetKey: contract.id,
      amount: Number(contract.totalPayable),
      contractId: contract.id,
      conversationId: contract.conversationId,
      categoryId: contract.categoryId,
      commissionPercent: Number(contract.commissionPercent),
      commissionAmount: Number(contract.commissionAmount),
      vatRate: Number(contract.vatRate),
      vatAmount: Number(contract.vatAmount),
      configSnapshot: {
        contractVersion: contract.version,
        depositPercent: Number(contract.depositPercent),
        downPayment: Number(contract.downPayment),
      },
      description: `Wesal contract ${contract.publicId ?? contract.id}`,
    };
  }

  private async chatFeeObligation(
    conversationId: string,
    principal: JwtPayload,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<Obligation> {
    const conversation = await manager.getRepository(Conversation).findOne({
      where: { id: conversationId },
    });
    if (!conversation) throw this.notFound('CONVERSATION_NOT_FOUND', language);
    const isProvider = principal.type === 'provider';
    const isParticipant = isProvider
      ? conversation.providerId === principal.sub
      : principal.type === 'user' && conversation.userId === principal.sub;
    if (!isParticipant || conversation.status !== ConversationStatus.ACTIVE) {
      throw this.badRequest('UNAUTHORIZED_ACCESS', language);
    }
    const listing = await manager
      .getRepository(Listing)
      .findOne({ where: { id: conversation.listingId } });
    const category = listing
      ? await manager
          .getRepository(Category)
          .findOne({ where: { id: listing.categoryId } })
      : null;
    const enabled = isProvider
      ? Boolean(category?.providerConversationFeeEnabled)
      : Boolean(category?.customerConversationFeeEnabled);
    const amount = Number(
      isProvider
        ? (category?.providerConversationFee ?? 0)
        : (category?.customerConversationFee ?? 0),
    );
    const paidAt = isProvider
      ? conversation.providerFeePaidAt
      : conversation.customerFeePaidAt;
    if (!enabled || amount <= 0 || paidAt) {
      throw this.badRequest('NOT_PAYABLE', language);
    }
    return {
      purpose: isProvider
        ? PaymentPurpose.CHAT_PROVIDER
        : PaymentPurpose.CHAT_CUSTOMER,
      payerType: isProvider ? PayerType.PROVIDER : PayerType.USER,
      targetKey: `${conversation.id}:${conversation.feeCycle}`,
      amount,
      conversationId: conversation.id,
      categoryId: category?.id ?? null,
      configSnapshot: { enabled, amount, feeCycle: conversation.feeCycle },
      description: `Wesal chat fee ${conversation.publicId ?? conversation.id}`,
    };
  }

  private async premiumAdObligation(
    listingId: string,
    principal: JwtPayload,
    manager: EntityManager,
    language: LanguageCode,
  ): Promise<Obligation> {
    const listing = await manager
      .getRepository(Listing)
      .findOne({ where: { id: listingId } });
    if (!listing) throw this.notFound('LISTING_NOT_FOUND', language);
    if (principal.type !== 'provider' || listing.providerId !== principal.sub) {
      throw this.badRequest('UNAUTHORIZED_ACCESS', language);
    }
    if (listing.promotionStatus !== PromotionStatus.PENDING_PAYMENT) {
      throw this.badRequest('NOT_PAYABLE', language);
    }
    // S4-56: no featuring an ad while its category is inactive.
    if (!(await isCategoryActive(manager, listing.categoryId))) {
      throw this.badRequest('CATEGORY_INACTIVE', language);
    }
    const setting = await this.settingService.getSetting();
    const fee = Number(setting.premiumAdFee);
    if (
      !setting.premiumAdEnabled ||
      fee <= 0 ||
      setting.premiumAdDurationDays < 1
    ) {
      throw this.badRequest('PREMIUM_AD_DISABLED', language);
    }
    const cycle = listing.promotionCycle + 1;
    return {
      purpose: PaymentPurpose.PREMIUM_AD,
      payerType: PayerType.PROVIDER,
      targetKey: `${listing.id}:${cycle}`,
      amount: fee,
      listingId: listing.id,
      categoryId: listing.categoryId,
      configSnapshot: {
        fee,
        durationDays: setting.premiumAdDurationDays,
        promotionCycle: cycle,
      },
      description: `Wesal featured ad: ${listing.name}`,
    };
  }

  private async alertAdmins(
    subject: string,
    en: string,
    ar: string,
    payment: Payment | null,
  ): Promise<void> {
    await this.adminNotifications?.notifyAdmins({
      type: NotificationType.ADMIN_PAYMENT,
      ar: {
        title: 'دفعة تحتاج إلى مراجعة واسترداد',
        message: `${subject}: ${ar}`,
      },
      en: {
        title: 'Payment needs a refund review',
        message: `${subject}: ${en}`,
      },
      relatedEntityType: payment?.contractId ? 'contract' : 'payment',
      relatedEntityId: payment?.contractId ?? payment?.id,
    });
  }

  private badRequest(
    code: keyof typeof PAYMENT_ERROR_CODES,
    language: LanguageCode,
  ): I18nBadRequestException {
    const message = I18nService.translate(
      PAYMENT_ERROR_MESSAGES[PAYMENT_ERROR_CODES[code]],
      language,
    );
    return new I18nBadRequestException({ en: message, ar: message }, language);
  }

  private notFound(
    code: keyof typeof PAYMENT_ERROR_CODES,
    language: LanguageCode,
  ): I18nNotFoundException {
    const message = I18nService.translate(
      PAYMENT_ERROR_MESSAGES[PAYMENT_ERROR_CODES[code]],
      language,
    );
    return new I18nNotFoundException({ en: message, ar: message }, language);
  }
}
