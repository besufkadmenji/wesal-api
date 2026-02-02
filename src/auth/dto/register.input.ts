import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

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
  @IsPhoneNumber()
  phone: string;

  @Field({ nullable: true })
  @IsOptional()
  avatarFilename?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  countryId?: string;
}
