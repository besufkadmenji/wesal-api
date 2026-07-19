import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { ComplaintStatus } from '../enums/complaint-status.enum';

const SORTABLE_FIELDS = ['status', 'createdAt', 'updatedAt'] as const;
type ComplaintSortField = (typeof SORTABLE_FIELDS)[number];

export enum ComplaintSortFieldEnum {
  status = 'status',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}
registerEnumType(ComplaintSortFieldEnum, { name: 'ComplaintSortField' });

@InputType()
export class ComplaintPaginationInput extends PaginationInput {
  @Field(() => ComplaintStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => ComplaintSortFieldEnum, { nullable: true })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: ComplaintSortField;
}
