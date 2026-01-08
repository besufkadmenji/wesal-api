import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class DeleteUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
