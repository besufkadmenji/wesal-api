import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsEnum, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { ContractStatus } from '../enums/contract-status.enum';

const CONTRACT_SORTABLE_FIELDS = [
  'id',
  'agreedPrice',
  'downPayment',
  'status',
  'createdAt',
  'updatedAt',
] as const;

export type ContractSortField = (typeof CONTRACT_SORTABLE_FIELDS)[number];

export enum ContractSortFieldEnum {
  id = 'id',
  agreedPrice = 'agreedPrice',
  downPayment = 'downPayment',
  status = 'status',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(ContractSortFieldEnum, {
  name: 'ContractSortField',
  description: 'Available fields to sort contracts by',
});

@InputType()
export class ContractPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field(() => ContractStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @Field(() => ContractSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(CONTRACT_SORTABLE_FIELDS)
  sortBy?: ContractSortField;
}
