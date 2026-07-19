import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { AdminPermissionType } from '../enums/admin-permission-type.enum';
import { AdminStatus } from '../enums/admin-status.enum';
import { AdminUserType } from '../enums/admin-user-type.enum';

@InputType()
export class CreateAdminInput {
  @Field()
  @IsNotEmpty()
  @IsEmail({ allow_utf8_local_part: false, require_tld: true })
  @Matches(/^\p{ASCII}+$/u, {
    message: 'email must contain only ASCII characters',
  })
  email: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @Field()
  @IsOptional()
  @IsString()
  @Matches(/^05\d{8}$/, {
    message:
      'phoneNumber must be a valid Saudi mobile number starting with 05 and containing 10 digits',
  })
  phoneNumber: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatarFilename: string;

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
