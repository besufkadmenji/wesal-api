import { Field, Float, ObjectType } from '@nestjs/graphql';
import { CancellationOutcome } from '../enums/cancellation-outcome.enum';

/** The customer's money outcome if they cancel (or refuse receipt) now. */
@ObjectType()
export class CancellationPreview {
  @Field(() => CancellationOutcome)
  outcome: CancellationOutcome;

  @Field(() => Float, { description: 'Refunded to the customer (SAR)' })
  refundAmount: number;

  @Field(() => Float, {
    description: 'Released to the provider (SAR), after commission',
  })
  providerAmount: number;
}
