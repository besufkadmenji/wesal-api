import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsIn, IsString } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { AdminStatus } from '../enums/admin-status.enum';
import { AdminPermissionType } from '../enums/admin-permission-type.enum';

const ADMIN_SORTABLE_FIELDS = [
  'id',
  'email',
  'fullName',
  'status',
  'permissionType',
  'createdAt',
  'updatedAt',
] as const;

export type AdminSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export enum AdminSortFieldEnum {
  id = 'id',
  email = 'email',
  fullName = 'fullName',
  status = 'status',
  permissionType = 'permissionType',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(AdminSortFieldEnum, {
  name: 'AdminSortField',
  description: 'Available fields to sort admins by',
});

@InputType()
export class AdminPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => AdminStatus, { nullable: true })
  @IsOptional()
  status?: AdminStatus;

  @Field(() => AdminPermissionType, { nullable: true })
  @IsOptional()
  permissionType?: AdminPermissionType;

  @Field(() => AdminSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(ADMIN_SORTABLE_FIELDS)
  sortBy?: AdminSortField;
}
