import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { RatingStatus } from '../enums/rating-status.enum';

const RATING_SORTABLE_FIELDS = [
  'rating',
  'status',
  'createdAt',
  'updatedAt',
] as const;

export type RatingSortField = (typeof RATING_SORTABLE_FIELDS)[number];

export enum RatingSortFieldEnum {
  rating = 'rating',
  status = 'status',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(RatingSortFieldEnum, {
  name: 'RatingSortField',
  description: 'Available fields to sort ratings by',
});

/** Admin comments-management filters (BRD 4.3.19). */
@InputType()
export class RatingPaginationInput extends PaginationInput {
  @Field({
    nullable: true,
    description:
      'Matches customer name/mobile, contract no., listing name or trade name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => RatingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(RatingStatus)
  status?: RatingStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  minRating?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  maxRating?: number;

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

  @Field(() => RatingSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(RATING_SORTABLE_FIELDS)
  sortBy?: RatingSortField;
}
