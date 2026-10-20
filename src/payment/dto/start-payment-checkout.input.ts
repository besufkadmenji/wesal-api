import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsUUID } from 'class-validator';
import { CheckoutPurpose } from '../enums/checkout-purpose.enum';
import { PaymentMethod } from '../enums/payment-method.enum';

@InputType()
export class StartPaymentCheckoutInput {
  @Field(() => CheckoutPurpose)
  @IsEnum(CheckoutPurpose)
  purpose: CheckoutPurpose;

  @Field(() => ID, {
    description: 'Contract, conversation or listing id, by purpose',
  })
  @IsUUID()
  targetId: string;

  @Field(() => PaymentMethod)
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
