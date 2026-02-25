import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPhoneValid } from 'lib/common/validators/is-phone-valid';

@InputType()
export class RegisterProviderInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  commercialName: string;

  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,3}$/, {
    message:
      'dialCode must be a valid international dial code (e.g., +966, 966, 1)',
  })
  dialCode?: string;

  @Field()
  @IsNotEmpty()
  @IsPhoneValid()
  phone: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatarFilename?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
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
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, {
    message: 'Invalid IBAN format',
  })
  ibanNumber?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  commercialRegistrationNumber: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  commercialRegistrationFilename?: string;

  @Field({ nullable: true })
  @IsOptional()
  withAbsher?: boolean;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
