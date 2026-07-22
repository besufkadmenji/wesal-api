import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsUUID, MinLength } from 'class-validator';

@InputType()
export class CompleteContractInput {
  @Field()
  @IsUUID()
  contractId: string;

  @Field()
  @IsString()
  @MinLength(1)
  signatureData: string;
}
