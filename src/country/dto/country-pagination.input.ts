import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

const COUNTRY_SORTABLE_FIELDS = [
  'id',
  'code',
  'name',
  'createdAt',
  'updatedAt',
] as const;

export type CountrySortField = (typeof COUNTRY_SORTABLE_FIELDS)[number];

export enum CountrySortFieldEnum {
  id = 'id',
  code = 'code',
  name = 'name',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(CountrySortFieldEnum, {
  name: 'CountrySortField',
  description: 'Available fields to sort countries by',
});

@InputType()
export class CountryPaginationInput extends PaginationInput {
  @Field(() => CountrySortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(COUNTRY_SORTABLE_FIELDS)
  sortBy?: CountrySortField;
}
