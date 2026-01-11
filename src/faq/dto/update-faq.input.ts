import { CreateFaqInput } from './create-faq.input';
import { InputType, Field, ID, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateFaqInput extends PartialType(CreateFaqInput) {
  @Field(() => ID)
  id: string;
}
