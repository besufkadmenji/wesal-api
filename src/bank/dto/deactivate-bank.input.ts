import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class DeactivateBankInput {
  @Field()
  @IsString()
  reason: string;
}
