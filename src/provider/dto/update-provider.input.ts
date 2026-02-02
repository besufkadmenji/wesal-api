import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';
import { CreateProviderInput } from './create-provider.input';

@InputType()
export class UpdateProviderInput extends PartialType(CreateProviderInput) {
  @Field()
  @IsUUID()
  id: string;
}
