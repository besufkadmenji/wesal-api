import { InputType, Field, Float } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractSignatureInput } from './contract-signature.input';

@InputType()
export class CreateContractInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  providerId: string;

  @Field(() => Float)
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  agreedPrice: number;

  @Field(() => Float)
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  downPayment: number;

  @Field(() => ContractStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @Field(() => [ContractSignatureInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractSignatureInput)
  signatures?: ContractSignatureInput[];
}
