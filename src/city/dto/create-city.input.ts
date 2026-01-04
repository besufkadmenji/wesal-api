import { Field, InputType, ID } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength, IsUUID } from 'class-validator';
import { CITY_ERROR_CODES } from '../errors/city.error-codes';

@InputType()
export class CreateCityInput {
  @Field(() => ID)
  @IsNotEmpty({
    message: CITY_ERROR_CODES.COUNTRY_ID_REQUIRED,
  })
  @IsUUID('4', {
    message: CITY_ERROR_CODES.INVALID_COUNTRY_ID,
  })
  countryId: string;

  @Field()
  @IsNotEmpty({
    message: CITY_ERROR_CODES.CITY_NAME_REQUIRED,
  })
  @MaxLength(500, {
    message: CITY_ERROR_CODES.INVALID_CITY_NAME_LENGTH,
  })
  nameEn: string;

  @Field()
  @IsNotEmpty({
    message: CITY_ERROR_CODES.CITY_NAME_REQUIRED,
  })
  @MaxLength(500, {
    message: CITY_ERROR_CODES.INVALID_CITY_NAME_LENGTH,
  })
  nameAr: string;
}
