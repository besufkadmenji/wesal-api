import { UseGuards } from '@nestjs/common';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Parent,
  ResolveField,
  createUnionType,
} from '@nestjs/graphql';
import { PaymentService } from './payment.service';
import type { PaymentPayer as PaymentPayerValue } from './payment.service';
import { Payment } from './entities/payment.entity';
import { PaymentPaginationInput } from './dto/payment-pagination.input';
import { PaginatedPaymentResponse } from './dto/paginated-payment.response';
import { ContractPaymentResponse } from './dto/contract-payment.response';
import { ConversationFeePaymentResponse } from './dto/conversation-fee-payment.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';

export const PaymentPayer = createUnionType({
  name: 'PaymentPayer',
  types: () => [User, Provider] as const,
  resolveType: (value: PaymentPayerValue) =>
    value instanceof Provider ? Provider : User,
});

@Resolver(() => Payment)
@UseGuards(JwtAuthGuard)
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Mutation(() => ContractPaymentResponse, {
    description: 'Settle an accepted contract using the Sprint 3 mock',
  })
  async payContract(
    @Args('contractId') contractId: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<ContractPaymentResponse> {
    return this.paymentService.settleContractPayment(
      contractId,
      principal,
      language,
    );
  }

  @Mutation(() => ConversationFeePaymentResponse, {
    description: 'Settle the authenticated participant conversation fee',
  })
  async payConversationFee(
    @Args('conversationId') conversationId: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<ConversationFeePaymentResponse> {
    return this.paymentService.settleConversationFee(
      conversationId,
      principal,
      language,
    );
  }

  @Query(() => PaginatedPaymentResponse, { name: 'payments' })
  async findAll(
    @CurrentPrincipal() principal: JwtPayload,
    @Args('input', { nullable: true }) input?: PaymentPaginationInput,
  ): Promise<IPaginatedType<Payment>> {
    return this.paymentService.findAll(input ?? {}, principal);
  }

  @Query(() => Payment, { name: 'payment' })
  async findOne(
    @Args('id') id: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Payment> {
    return this.paymentService.findOne(id, principal, language);
  }

  @ResolveField(() => PaymentPayer, { nullable: true })
  async payer(@Parent() payment: Payment): Promise<PaymentPayerValue | null> {
    return this.paymentService.resolvePayer(payment);
  }
}
