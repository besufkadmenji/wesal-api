import { InputType, Field, registerEnumType, Int } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsIn, IsInt, Min, Max } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

const RATING_SORTABLE_FIELDS = [
  'id',
  'rating',
  'createdAt',
  'updatedAt',
] as const;

export type RatingSortField = (typeof RATING_SORTABLE_FIELDS)[number];

export enum RatingSortFieldEnum {
  id = 'id',
  rating = 'rating',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(RatingSortFieldEnum, {
  name: 'RatingSortField',
  description: 'Available fields to sort ratings by',
});

@InputType()
export class RatingPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  advertisementId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @Field(() => RatingSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(RATING_SORTABLE_FIELDS)
  sortBy?: RatingSortField;
}
