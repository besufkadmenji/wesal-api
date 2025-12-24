import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsEnum, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';

const PAYMENT_SORTABLE_FIELDS = [
  'id',
  'amount',
  'status',
  'paymentMethod',
  'createdAt',
  'updatedAt',
] as const;

export type PaymentSortField = (typeof PAYMENT_SORTABLE_FIELDS)[number];

export enum PaymentSortFieldEnum {
  id = 'id',
  amount = 'amount',
  status = 'status',
  paymentMethod = 'paymentMethod',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(PaymentSortFieldEnum, {
  name: 'PaymentSortField',
  description: 'Available fields to sort payments by',
});

@InputType()
export class PaymentPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field(() => PaymentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @Field(() => PaymentMethod, { nullable: true })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @Field(() => PaymentSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(PAYMENT_SORTABLE_FIELDS)
  sortBy?: PaymentSortField;
}
