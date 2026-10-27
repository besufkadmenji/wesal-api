import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AUTH_ERROR_CODES } from '../errors/auth.error-codes';
import '../errors/auth.error-messages';

@InputType()
export class LoginProviderInput {
  @Field()
  @IsNotEmpty({ message: AUTH_ERROR_CODES.EMAIL_OR_PHONE_REQUIRED })
  @IsString({ message: AUTH_ERROR_CODES.EMAIL_OR_PHONE_REQUIRED })
  emailOrPhone: string;

  @Field()
  @IsNotEmpty({ message: AUTH_ERROR_CODES.PASSWORD_REQUIRED })
  @IsString({ message: AUTH_ERROR_CODES.PASSWORD_REQUIRED })
  @MinLength(1, { message: AUTH_ERROR_CODES.PASSWORD_REQUIRED })
  password: string;
}
