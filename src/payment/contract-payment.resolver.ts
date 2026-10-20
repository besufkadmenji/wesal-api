import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentPurpose } from './enums/payment-purpose.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentCheckoutService } from './payment-checkout.service';

/** S4-11 / S4-12: payment details on a contract, for its two parties. */
@Resolver(() => Contract)
@UseGuards(JwtAuthGuard)
export class ContractPaymentResolver {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly checkout: PaymentCheckoutService,
  ) {}

  @ResolveField(() => PaymentMethod, {
    nullable: true,
    description: 'How the contract was paid (null until paid)',
  })
  async paymentMethod(
    @Parent() contract: Contract,
    @CurrentPrincipal() principal?: JwtPayload,
  ): Promise<PaymentMethod | null> {
    if (!contract.paidAt || !isParty(contract, principal)) return null;
    const payment = await this.paymentRepository.findOne({
      where: {
        contractId: contract.id,
        purpose: PaymentPurpose.CONTRACT,
        status: PaymentStatus.COMPLETED,
      },
      select: { id: true, paymentMethod: true },
    });
    return payment?.paymentMethod ?? null;
  }

  @ResolveField(() => [PaymentMethod], {
    nullable: true,
    description:
      'Methods the customer may pay with now (BNPL bounds applied); customer only',
  })
  async paymentMethods(
    @Parent() contract: Contract,
    @CurrentPrincipal() principal?: JwtPayload,
  ): Promise<PaymentMethod[] | null> {
    if (
      principal?.type !== 'user' ||
      principal.sub !== contract.clientId ||
      contract.status !== ContractStatus.ACCEPTED
    ) {
      return null;
    }
    return this.checkout.contractPaymentMethods(contract);
  }
}

function isParty(contract: Contract, principal?: JwtPayload): boolean {
  return (
    (principal?.type === 'user' && principal.sub === contract.clientId) ||
    (principal?.type === 'provider' && principal.sub === contract.providerId)
  );
}
