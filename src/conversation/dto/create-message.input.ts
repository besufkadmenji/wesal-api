import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateMessageInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  senderId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  content: string;
}
