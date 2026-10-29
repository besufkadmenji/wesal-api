import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ADMIN_ERROR_CODES } from '../errors/admin.error-codes';
import { AdminPermissionType } from '../enums/admin-permission-type.enum';
import { AdminStatus } from '../enums/admin-status.enum';
import { AdminUserType } from '../enums/admin-user-type.enum';

@InputType()
export class UpdateAdminInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail({ allow_utf8_local_part: false, require_tld: true })
  @Matches(/^\p{ASCII}+$/u, {
    message: 'email must contain only ASCII characters',
  })
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

  @Field()
  @IsOptional()
  @IsString()
  @Matches(/^05\d{8}$/, {
    message: ADMIN_ERROR_CODES.INVALID_SAUDI_MOBILE,
  })
  phoneNumber: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatarFilename: string;
}
