import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
} from 'class-validator';

@InputType()
export class CreateProviderInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dialCode?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  commercialName?: string;

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
  bankName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ibanNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  commercialRegistrationNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  commercialRegistrationFilename?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  withAbsher?: boolean;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
