import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

@InputType()
export class LoginInput {
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
