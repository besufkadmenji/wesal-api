import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsEnum, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { AdvertisementStatus } from '../enums/advertisement-status.enum';

const ADVERTISEMENT_SORTABLE_FIELDS = [
  'id',
  'title',
  'price',
  'status',
  'createdAt',
  'updatedAt',
] as const;

export type AdvertisementSortField =
  (typeof ADVERTISEMENT_SORTABLE_FIELDS)[number];

export enum AdvertisementSortFieldEnum {
  id = 'id',
  title = 'title',
  price = 'price',
  status = 'status',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(AdvertisementSortFieldEnum, {
  name: 'AdvertisementSortField',
  description: 'Available fields to sort advertisements by',
});

@InputType()
export class AdvertisementPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @Field(() => AdvertisementStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AdvertisementStatus)
  status?: AdvertisementStatus;

  @Field(() => AdvertisementSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(ADVERTISEMENT_SORTABLE_FIELDS)
  sortBy?: AdvertisementSortField;
}
