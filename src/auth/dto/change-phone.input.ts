import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsPhoneValid } from 'lib/common/validators/is-phone-valid';

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
  @IsPhoneValid()
  newPhone: string;
}
