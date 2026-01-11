import { Field, InputType, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateFaqInput } from './create-faq.input';

@InputType()
export class UpdateFaqInput extends PartialType(CreateFaqInput) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
