import { InputType, Field, Float } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@InputType()
export class CreatePaymentInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  contractId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @Field(() => Float)
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @Field(() => PaymentMethod)
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => PaymentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
