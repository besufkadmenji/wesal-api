import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContractRuleInput } from '../../signed-contract/contract-rule.type';

@InputType()
export class SignContractInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  serviceProviderSignature: string;

  @Field(() => [ContractRuleInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractRuleInput)
  acceptedRulesEn: ContractRuleInput[] | null;

  @Field(() => [ContractRuleInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractRuleInput)
  acceptedRulesAr: ContractRuleInput[] | null;
}

@InputType()
export class AdminSignContractInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  providerId: string;
}
