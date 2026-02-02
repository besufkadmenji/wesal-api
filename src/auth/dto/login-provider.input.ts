import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class LoginProviderInput {
  @Field()
  @IsNotEmpty({
    message: 'Email or phone number is required',
  })
  @IsString()
  emailOrPhone: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  password: string;
}
