import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateContractInput } from './create-contract.input';

@InputType()
export class UpdateContractInput extends PartialType(CreateContractInput) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
