import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

@InputType()
export class ProviderCompleteContractInput {
  @Field()
  @IsUUID()
  contractId: string;

  @Field()
  @IsString()
  @MinLength(1)
  signatureData: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryEstimateDays?: number;
}
