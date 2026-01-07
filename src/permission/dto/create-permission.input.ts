import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  MinLength,
} from 'class-validator';
import { PermissionPlatform } from '../enums/permission-platform.enum';

@InputType()
export class CreatePermissionInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  name: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  nameAr: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  description: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  module: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  action: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  resource: string;

  @Field(() => PermissionPlatform, { defaultValue: PermissionPlatform.GLOBAL })
  @IsEnum(PermissionPlatform)
  permissionPlatform?: PermissionPlatform;
}
