import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsIn, IsString } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

const SIGNED_CONTRACT_SORTABLE_FIELDS = [
  'id',
  'userId',
  'createdAt',
  'updatedAt',
] as const;

export type SignedContractSortField =
  (typeof SIGNED_CONTRACT_SORTABLE_FIELDS)[number];

export enum SignedContractSortFieldEnum {
  id = 'id',
  userId = 'userId',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(SignedContractSortFieldEnum, {
  name: 'SignedContractSortField',
  description: 'Available fields to sort signed contracts by',
});

@InputType()
export class SignedContractPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => SignedContractSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(SIGNED_CONTRACT_SORTABLE_FIELDS)
  sortBy?: SignedContractSortField;
}
