import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class AdminResetPasswordInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  resetToken: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
