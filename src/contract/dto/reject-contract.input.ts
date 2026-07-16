import { Field, InputType } from '@nestjs/graphql';
import {
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class RejectContractInput {
  @Field()
  @IsUUID()
  contractId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @Matches(/\S/)
  reason: string;
}
