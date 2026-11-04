import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaymentCheckout {
  @Field(() => ID)
  paymentId: string;

  @Field({ description: 'Send the customer here to pay' })
  redirectUrl: string;

  @Field({
    description:
      'Already paid (temporary mock auto-success); redirectUrl is the web return page',
  })
  completed: boolean;
}
