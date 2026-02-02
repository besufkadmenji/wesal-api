import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationInput } from 'lib/common/dto/pagination.input';
import { UserStatus } from '../enums/user-status.enum';

const USER_SORTABLE_FIELDS = [
  'id',
  'phone',
  'email',
  'fullName',
  'createdAt',
  'updatedAt',
  'isActive',
] as const;

export type UserSortField = (typeof USER_SORTABLE_FIELDS)[number];

export enum UserSortFieldEnum {
  id = 'id',
  phone = 'phone',
  email = 'email',
  fullName = 'fullName',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  isActive = 'isActive',
}

registerEnumType(UserSortFieldEnum, {
  name: 'UserSortField',
  description: 'Available fields to sort users by',
});

@InputType()
export class UserPaginationInput extends PaginationInput {
  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @Field(() => UserSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(USER_SORTABLE_FIELDS)
  sortBy?: UserSortField;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
