import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
} from 'class-validator';
import { AdminPermissionType } from '../enums/admin-permission-type.enum';
import { AdminUserType } from '../enums/admin-user-type.enum';
import { AdminStatus } from '../enums/admin-status.enum';

@InputType()
export class CreateAdminInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  roleName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @Field(() => AdminPermissionType)
  @IsNotEmpty()
  @IsEnum(AdminPermissionType)
  permissionType: AdminPermissionType;

  @Field(() => AdminUserType)
  @IsNotEmpty()
  @IsEnum(AdminUserType)
  userType: AdminUserType;

  @Field(() => AdminStatus, { defaultValue: AdminStatus.ACTIVE })
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}
