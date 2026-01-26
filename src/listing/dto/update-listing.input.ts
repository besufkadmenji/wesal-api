import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { CreateListingInput } from './create-listing.input';

@InputType()
export class UpdateListingInput extends PartialType(CreateListingInput) {
  @Field()
  @IsUUID('4', { message: 'id must be a valid UUID' })
  @IsNotEmpty({ message: 'id is required' })
  id: string;
}
