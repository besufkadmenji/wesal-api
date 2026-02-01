import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateBankInput } from './create-bank.input';

@InputType()
export class UpdateBankInput extends PartialType(CreateBankInput) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
