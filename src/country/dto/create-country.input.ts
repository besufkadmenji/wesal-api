import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength } from 'class-validator';
import { COUNTRY_ERROR_CODES } from '../errors/country.error-codes';

@InputType()
export class CreateCountryInput {
  @Field()
  @IsNotEmpty({
    message: COUNTRY_ERROR_CODES.COUNTRY_CODE_REQUIRED,
  })
  @MaxLength(500, {
    message: COUNTRY_ERROR_CODES.INVALID_COUNTRY_CODE_LENGTH,
  })
  code: string;

  @Field()
  @IsNotEmpty({
    message: COUNTRY_ERROR_CODES.COUNTRY_NAME_REQUIRED,
  })
  @MaxLength(500, {
    message: COUNTRY_ERROR_CODES.INVALID_COUNTRY_NAME_LENGTH,
  })
  name: string;
}
