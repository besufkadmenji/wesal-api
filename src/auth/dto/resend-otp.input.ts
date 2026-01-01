import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { OtpType } from '../enums/otp-type.enum';

@InputType()
export class ResendOtpInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  target: string;

  @Field(() => OtpType)
  @IsNotEmpty()
  @IsEnum(OtpType)
  type: OtpType;
}
