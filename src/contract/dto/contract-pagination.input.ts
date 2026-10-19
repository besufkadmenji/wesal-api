import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsIn,
  IsString,
  IsDate,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractStatusGroup } from '../contract-status-group';

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

  @Field(() => ContractStatusGroup, {
    nullable: true,
    description: 'My Contracts tab (S4-1); combines with status if both set',
  })
  @IsOptional()
  @IsEnum(ContractStatusGroup)
  statusGroup?: ContractStatusGroup;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Field({
    nullable: true,
    description: 'Only Wesal Al-Khair (charity) contracts, or only non-charity',
  })
  @IsOptional()
  @IsBoolean()
  isCharity?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @Field(() => ContractSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(CONTRACT_SORTABLE_FIELDS)
  sortBy?: ContractSortField;
}
