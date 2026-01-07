import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { AdminPermissionType } from '../enums/admin-permission-type.enum';
import { AdminUserType } from '../enums/admin-user-type.enum';
import { AdminStatus } from '../enums/admin-status.enum';

@InputType()
export class UpdateAdminInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fullName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  roleName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @Field(() => AdminPermissionType, { nullable: true })
  @IsOptional()
  @IsEnum(AdminPermissionType)
  permissionType?: AdminPermissionType;

  @Field(() => AdminUserType, { nullable: true })
  @IsOptional()
  @IsEnum(AdminUserType)
  userType?: AdminUserType;

  @Field(() => AdminStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}
