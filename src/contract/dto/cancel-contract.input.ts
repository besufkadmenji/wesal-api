import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsUUID, MinLength } from 'class-validator';

@InputType()
export class CancelContractInput {
  @Field()
  @IsUUID()
  contractId: string;

  @Field()
  @IsString()
  @MinLength(3)
  reason: string;
}
