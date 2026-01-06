import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class VerifyChangeEmailInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  changeToken: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  code: string;
}
