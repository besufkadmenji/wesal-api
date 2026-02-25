import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { CityStatus } from '../enum/city.enum';
import { PaginationInput } from 'lib/common/dto/pagination.input';

const CITY_SORTABLE_FIELDS = [
  'id',
  'nameEn',
  'nameAr',
  'countryId',
  'createdAt',
  'updatedAt',
] as const;

export type CitySortField = (typeof CITY_SORTABLE_FIELDS)[number];

export enum CitySortFieldEnum {
  id = 'id',
  nameEn = 'nameEn',
  nameAr = 'nameAr',
  countryId = 'countryId',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(CitySortFieldEnum, {
  name: 'CitySortField',
  description: 'Available fields to sort cities by',
});

@InputType()
export class CityPaginationInput extends PaginationInput {
  @Field(() => CitySortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(CITY_SORTABLE_FIELDS)
  sortBy?: CitySortField;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => CityStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CityStatus)
  status?: CityStatus;
}
