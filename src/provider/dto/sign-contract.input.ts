import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class SignContractInput {
  @Field()
  @IsNotEmpty()
  @IsString()
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
  @Field()
  @IsNotEmpty()
  @IsString()
  providerId: string;
}
