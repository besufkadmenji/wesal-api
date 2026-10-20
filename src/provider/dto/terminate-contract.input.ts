import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class TerminateContractInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  terminationReason: string;
}

/** S4-58: the admin rejects a provider's termination request. */
@InputType()
export class RejectContractTerminationInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  providerId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  reason: string;
}

@InputType()
export class AdminTerminateContractInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  providerId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  terminationReason: string;
}
