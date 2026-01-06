import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsPhoneNumber, IsString, Matches } from 'class-validator';

@InputType()
export class ChangePhoneInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+\d{1,3}$/, {
    message: 'Dial code must be in format +XXX (e.g., +966)',
  })
  countryCode: string;

  @Field()
  @IsNotEmpty()
  @IsPhoneNumber()
  newPhone: string;
}
