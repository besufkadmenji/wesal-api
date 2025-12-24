import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreatePaymentInput } from './create-payment.input';

@InputType()
export class UpdatePaymentInput extends PartialType(CreatePaymentInput) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
