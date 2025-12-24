import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

const FAVORITE_SORTABLE_FIELDS = ['id', 'createdAt'] as const;

export type FavoriteSortField = (typeof FAVORITE_SORTABLE_FIELDS)[number];

export enum FavoriteSortFieldEnum {
  id = 'id',
  createdAt = 'createdAt',
}

registerEnumType(FavoriteSortFieldEnum, {
  name: 'FavoriteSortField',
  description: 'Available fields to sort favorites by',
});

@InputType()
export class FavoritePaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  advertisementId?: string;

  @Field(() => FavoriteSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(FAVORITE_SORTABLE_FIELDS)
  sortBy?: FavoriteSortField;
}
