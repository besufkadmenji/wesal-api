import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class VerifyChangePhoneInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  changeToken: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  code: string;
}
