import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class TerminateContractInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  terminationReason: string;
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
