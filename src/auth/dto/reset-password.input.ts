import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength, Length } from 'class-validator';

@InputType()
export class ResetPasswordInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  target: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
