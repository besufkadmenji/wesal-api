import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsString, IsUUID, Min, MinLength } from 'class-validator';

@InputType()
export class AcceptContractInput {
  @Field()
  @IsUUID()
  contractId: string;

  @Field()
  @IsString()
  @MinLength(1)
  signatureData: string;

  @Field(() => Int, {
    description: 'Execution time the provider commits to, in hours',
  })
  @IsInt()
  @Min(1)
  executionHours: number;
}
