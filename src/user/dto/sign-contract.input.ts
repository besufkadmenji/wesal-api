import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class SignContractInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  serviceProviderSignature: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  platformManagerSignature: string;
}
