import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { AUTH_ERROR_CODES } from '../errors/auth.error-codes';
import '../errors/auth.error-messages';

@InputType()
export class ForgotPasswordInput {
  @Field()
  @IsNotEmpty({ message: AUTH_ERROR_CODES.EMAIL_OR_PHONE_REQUIRED })
  @IsString({ message: AUTH_ERROR_CODES.EMAIL_OR_PHONE_REQUIRED })
  emailOrPhone: string;
}
