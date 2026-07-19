import { Field, ObjectType } from '@nestjs/graphql';
import { Listing } from '../../listing/entities/listing.entity';
import { Payment } from '../entities/payment.entity';

@ObjectType()
export class PremiumAdPaymentResponse {
  @Field(() => Payment)
  payment: Payment;

  @Field(() => Listing)
  listing: Listing;
}
