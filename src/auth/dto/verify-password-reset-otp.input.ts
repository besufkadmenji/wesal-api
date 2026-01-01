import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Length } from 'class-validator';

@InputType()
export class VerifyPasswordResetOtpInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  target: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  code: string;
}
