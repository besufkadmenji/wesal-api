import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';

export enum ContractResolution {
  REFUND_CUSTOMER = 'REFUND_CUSTOMER',
  RELEASE_PROVIDER = 'RELEASE_PROVIDER',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
}

registerEnumType(ContractResolution, { name: 'ContractResolution' });

@InputType()
export class AdminResolveContractInput {
  @Field()
  @IsUUID()
  contractId: string;

  @Field(() => ContractResolution)
  @IsEnum(ContractResolution)
  resolution: ContractResolution;

  @Field()
  @IsString()
  @MinLength(3)
  reason: string;
}
