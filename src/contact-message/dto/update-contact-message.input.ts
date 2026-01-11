import { CreateContactMessageInput } from './create-contact-message.input';
import { InputType, Field, ID, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateContactMessageInput extends PartialType(CreateContactMessageInput) {
  @Field(() => ID)
  id: string;
}
