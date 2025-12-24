import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
} from 'class-validator';
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
  fullName: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(500, {
    message: USER_ERROR_CODES.INVALID_AVATAR_URL_LENGTH,
  })
  avatarUrl?: string;

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
}
