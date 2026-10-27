import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { AUTH_ERROR_CODES } from '../errors/auth.error-codes';
import '../errors/auth.error-messages';

@InputType()
export class VerifyPasswordResetOtpInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  target: string;

  @Field()
  @IsNotEmpty({ message: AUTH_ERROR_CODES.OTP_CODE_FORMAT })
  @IsString({ message: AUTH_ERROR_CODES.OTP_CODE_FORMAT })
  @Length(4, 4, { message: AUTH_ERROR_CODES.OTP_CODE_FORMAT })
  code: string;
}
