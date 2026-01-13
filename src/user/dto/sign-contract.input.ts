import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class SignContractInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  serviceProviderSignature: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  platformManagerSignature: string | null;
}
