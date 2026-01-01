import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateMessageInput } from './create-message.input';

@InputType()
export class UpdateMessageInput extends PartialType(CreateMessageInput) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
