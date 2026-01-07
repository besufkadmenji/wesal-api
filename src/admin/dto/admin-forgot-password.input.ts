import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsEmail } from 'class-validator';

@InputType()
export class AdminForgotPasswordInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}