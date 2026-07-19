import { Field, ObjectType } from '@nestjs/graphql';
import { Contract } from '../../contract/entities/contract.entity';
import { Payment } from '../entities/payment.entity';

@ObjectType()
export class ContractPaymentResponse {
  @Field(() => Payment)
  payment: Payment;

  @Field(() => Contract)
  contract: Contract;
}
