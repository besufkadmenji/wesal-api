import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateComplaintInput } from './create-complaint.input';

@InputType()
export class UpdateComplaintInput extends PartialType(CreateComplaintInput) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
