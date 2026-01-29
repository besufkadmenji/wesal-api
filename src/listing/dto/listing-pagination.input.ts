import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationInput } from 'lib/common/dto/pagination.input';
import { ListingStatus } from '../enums/listing.enum';

const LISTING_SORTABLE_FIELDS = [
  'id',
  'name',
  'price',
  'createdAt',
  'updatedAt',
  'status',
] as const;

export type ListingSortField = (typeof LISTING_SORTABLE_FIELDS)[number];

export enum ListingSortFieldEnum {
  id = 'id',
  name = 'name',
  price = 'price',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  status = 'status',
}

registerEnumType(ListingSortFieldEnum, {
  name: 'ListingSortField',
  description: 'Available fields to sort listings by',
});

@InputType()
export class ListingPaginationInput extends PaginationInput {
  @Field(() => ListingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @Field(() => ListingSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(LISTING_SORTABLE_FIELDS)
  sortBy?: ListingSortField;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  minPrice?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  maxPrice?: number;
}
