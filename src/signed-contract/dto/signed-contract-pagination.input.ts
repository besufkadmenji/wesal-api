import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { SignedContractStatus } from '../../provider/enums/contract.enum';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

const SIGNED_CONTRACT_SORTABLE_FIELDS = [
  'id',
  'providerId',
  'createdAt',
  'updatedAt',
] as const;

export type SignedContractSortField =
  (typeof SIGNED_CONTRACT_SORTABLE_FIELDS)[number];

export enum SignedContractSortFieldEnum {
  id = 'id',
  providerId = 'providerId',
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
  providerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  // S4-58: e.g. the admin's "termination requested" filter.
  @Field(() => SignedContractStatus, { nullable: true })
  @IsOptional()
  @IsEnum(SignedContractStatus)
  status?: SignedContractStatus;

  @Field(() => SignedContractSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(SIGNED_CONTRACT_SORTABLE_FIELDS)
  sortBy?: SignedContractSortField;
}
