import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { CreatePaymentInput } from './dto/create-payment.input';
import { UpdatePaymentInput } from './dto/update-payment.input';
import { PaymentPaginationInput } from './dto/payment-pagination.input';
import { PaginatedPaymentResponse } from './dto/paginated-payment.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Payment)
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Mutation(() => Payment)
  async createPayment(
    @Args('input') createPaymentInput: CreatePaymentInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Payment> {
    return this.paymentService.create(createPaymentInput, language);
  }

  @Query(() => PaginatedPaymentResponse, { name: 'payments' })
  async findAll(
    @Args('input', { nullable: true }) input?: PaymentPaginationInput,
  ): Promise<IPaginatedType<Payment>> {
    return this.paymentService.findAll(input ?? {});
  }

  @Query(() => Payment, { name: 'payment' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Payment> {
    return this.paymentService.findOne(id, language);
  }

  @Mutation(() => Payment)
  async updatePayment(
    @Args('input') updatePaymentInput: UpdatePaymentInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Payment> {
    return this.paymentService.update(updatePaymentInput, language);
  }

  @Mutation(() => Payment)
  async removePayment(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Payment> {
    return this.paymentService.remove(id, language);
  }

  @Mutation(() => Payment, {
    description: 'Process a refund for a completed payment',
  })
  async refundPayment(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Payment> {
    return this.paymentService.processRefund(id, language);
  }
}
