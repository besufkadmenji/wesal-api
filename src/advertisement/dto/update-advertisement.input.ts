import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateAdvertisementInput } from './create-advertisement.input';

@InputType()
export class UpdateAdvertisementInput extends PartialType(
  CreateAdvertisementInput,
) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
