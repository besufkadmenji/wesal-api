import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateMessageInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  // The sender is taken from the authenticated token, never from the client.
  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  content: string;
}
