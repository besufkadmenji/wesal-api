import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

@InputType()
export class VerifyChangePhoneInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  changeToken: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+\d{1,3}$/, {
    message: 'Dial code must be in format +XXX (e.g., +966)',
  })
  countryCode: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  code: string;
}
