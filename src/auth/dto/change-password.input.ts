import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { AUTH_ERROR_CODES } from '../errors/auth.error-codes';
import '../errors/auth.error-messages';
import { PASSWORD_STRENGTH } from './password-strength';

@InputType()
export class ChangePasswordInput {
  @Field()
  @IsNotEmpty({ message: AUTH_ERROR_CODES.PASSWORD_REQUIRED })
  @IsString({ message: AUTH_ERROR_CODES.PASSWORD_REQUIRED })
  @Matches(PASSWORD_STRENGTH, { message: AUTH_ERROR_CODES.WEAK_PASSWORD })
  newPassword: string;
}
