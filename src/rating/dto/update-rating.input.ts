import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateRatingInput } from './create-rating.input';

@InputType()
export class UpdateRatingInput extends PartialType(CreateRatingInput) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
