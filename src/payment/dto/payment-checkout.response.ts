import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaymentCheckout {
  @Field(() => ID)
  paymentId: string;

  @Field({ description: 'Send the customer here to pay' })
  redirectUrl: string;
}
