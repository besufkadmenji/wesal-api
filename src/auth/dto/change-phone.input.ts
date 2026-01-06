import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsPhoneNumber, IsString, MinLength, MaxLength } from 'class-validator';

@InputType()
export class ChangePhoneInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(3)
  countryCode: string;

  @Field()
  @IsNotEmpty()
  @IsPhoneNumber()
  newPhone: string;
}
