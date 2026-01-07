import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength, IsEmail } from 'class-validator';

@InputType()
export class AdminLoginInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  password: string;
}