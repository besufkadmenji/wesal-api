import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ComplaintReporterType } from '../enums/complaint-reporter-type.enum';
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

  @Field(() => ComplaintReporterType, { nullable: true })
  @IsOptional()
  @IsEnum(ComplaintReporterType)
  reporterType?: ComplaintReporterType;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

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

  @Field(() => ComplaintSortFieldEnum, { nullable: true })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: ComplaintSortField;
}
