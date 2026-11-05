import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class RegisterPushDeviceInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;

  @Field()
  @IsIn(['ar', 'en'])
  language: 'ar' | 'en';
}
