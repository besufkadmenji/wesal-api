import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsEmail } from 'class-validator';

@InputType()
export class ChangeEmailInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  newEmail: string;
}
