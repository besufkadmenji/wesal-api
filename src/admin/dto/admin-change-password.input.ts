import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class AdminChangePasswordInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
