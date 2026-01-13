import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { USER_ERROR_CODES } from '../errors/user.error-codes';

@InputType()
export class CreateUserInput {
  @Field()
  @IsNotEmpty({
    message: USER_ERROR_CODES.PHONE_CAN_NOT_BE_EMPTY,
  })
  @Matches(/^[1-9]\d{8}$/, {
    message: USER_ERROR_CODES.INVALID_PHONE_FORMAT,
  })
  phone: string;

  @Field()
  @IsNotEmpty({
    message: USER_ERROR_CODES.EMAIL_CAN_NOT_BE_EMPTY,
  })
  @IsEmail({}, { message: USER_ERROR_CODES.INVALID_EMAIL_FORMAT })
  email: string;

  @Field()
  @IsNotEmpty({
    message: USER_ERROR_CODES.PASSWORD_CAN_NOT_BE_EMPTY,
  })
  @MinLength(6)
  @MaxLength(128, {
    message: USER_ERROR_CODES.INVALID_PASSWORD_LENGTH,
  })
  password: string;

  @Field()
  @IsNotEmpty({
    message: USER_ERROR_CODES.FULLNAME_CAN_NOT_BE_EMPTY,
  })
  @MaxLength(500, {
    message: USER_ERROR_CODES.INVALID_FULLNAME_LENGTH,
  })
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  commercialName?: string | null;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,3}$/, {
    message: 'dialCode must be a valid international dial code',
  })
  dialCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(500, {
    message: USER_ERROR_CODES.INVALID_AVATAR_URL_LENGTH,
  })
  avatarFilename?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(500, {
    message: USER_ERROR_CODES.INVALID_AVATAR_URL_LENGTH,
  })
  commercialRegistrationFilename?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID('4', { message: USER_ERROR_CODES.INVALID_COUNTRY_ID })
  countryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID('4', { message: USER_ERROR_CODES.INVALID_CITY_ID })
  cityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(10, {
    message: USER_ERROR_CODES.INVALID_LANGUAGE_CODE,
  })
  languageCode?: string;

  // Provider-specific fields
  @Field({ nullable: true })
  @IsOptional()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(255, {
    message: 'Bank name must not exceed 255 characters',
  })
  bankName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, {
    message: 'Invalid IBAN format',
  })
  ibanNumber?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @Field({ nullable: true })
  @IsOptional()
  commercialRegistrationNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  withAbsher?: boolean;

  @Field(() => UserRole)
  role: UserRole;
}
