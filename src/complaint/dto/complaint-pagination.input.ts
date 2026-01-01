import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsEnum, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { ComplaintStatus } from '../enums/complaint-status.enum';
import { ComplaintReason } from '../enums/complaint-reason.enum';

const COMPLAINT_SORTABLE_FIELDS = [
  'id',
  'status',
  'reason',
  'createdAt',
  'updatedAt',
] as const;

export type ComplaintSortField = (typeof COMPLAINT_SORTABLE_FIELDS)[number];

export enum ComplaintSortFieldEnum {
  id = 'id',
  status = 'status',
  reason = 'reason',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(ComplaintSortFieldEnum, {
  name: 'ComplaintSortField',
  description: 'Available fields to sort complaints by',
});

@InputType()
export class ComplaintPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  advertisementId?: string;

  @Field(() => ComplaintStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @Field(() => ComplaintReason, { nullable: true })
  @IsOptional()
  @IsEnum(ComplaintReason)
  reason?: ComplaintReason;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  reviewedBy?: string;

  @Field(() => ComplaintSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(COMPLAINT_SORTABLE_FIELDS)
  sortBy?: ComplaintSortField;
}
