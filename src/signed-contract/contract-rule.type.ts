import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@ObjectType()
export class ContractRule {
  @Field()
  label: string;

  @Field()
  value: string;
}

@InputType()
export class ContractRuleInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  label: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  value: string;
}
