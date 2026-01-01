import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsPhoneNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  Matches,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../../user/enums/user-role.enum';

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

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  // Provider-specific fields
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  cityId?: string;

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
  @IsString()
  @Matches(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, {
    message: 'Invalid IBAN format',
  })
  ibanNumber?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
