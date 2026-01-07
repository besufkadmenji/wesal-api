import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { PermissionPlatform } from '../enums/permission-platform.enum';

@InputType()
export class UpdatePermissionInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  nameAr?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  module?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  action?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  resource?: string;

  @Field(() => PermissionPlatform, { nullable: true })
  @IsOptional()
  @IsEnum(PermissionPlatform)
  permissionPlatform?: PermissionPlatform;
}
