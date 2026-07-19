import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateComplaintInput {
  @Field(() => ID)
  @IsUUID()
  conversationId: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  description: string;
}
