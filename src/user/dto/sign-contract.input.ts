import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

@InputType()
export class SignContractInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  serviceProviderSignature: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsNotEmpty()
  acceptedRulesEn: string | null;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsNotEmpty()
  acceptedRulesAr: string | null;
}

@InputType()
export class AdminSignContractInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  platformManagerName: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  platformManagerSignature: string;
}
