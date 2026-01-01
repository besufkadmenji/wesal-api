import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class ForgotPasswordInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  emailOrPhone: string;
}
