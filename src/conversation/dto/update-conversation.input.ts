import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateConversationInput } from './create-conversation.input';

@InputType()
export class UpdateConversationInput extends PartialType(
  CreateConversationInput,
) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
