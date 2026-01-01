import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum, Length } from 'class-validator';
import { OtpType } from '../enums/otp-type.enum';

@InputType()
export class VerifyOtpInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  target: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  code: string;

  @Field(() => OtpType)
  @IsNotEmpty()
  @IsEnum(OtpType)
  type: OtpType;
}
