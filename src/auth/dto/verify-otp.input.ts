import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum, Length } from 'class-validator';
import { OtpType } from '../enums/otp-type.enum';
import { AUTH_ERROR_CODES } from '../errors/auth.error-codes';
import '../errors/auth.error-messages';

@InputType()
export class VerifyOtpInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  target: string;

  @Field()
  @IsNotEmpty({ message: AUTH_ERROR_CODES.OTP_CODE_FORMAT })
  @IsString({ message: AUTH_ERROR_CODES.OTP_CODE_FORMAT })
  @Length(4, 4, { message: AUTH_ERROR_CODES.OTP_CODE_FORMAT })
  code: string;

  @Field(() => OtpType)
  @IsNotEmpty()
  @IsEnum(OtpType)
  type: OtpType;
}
