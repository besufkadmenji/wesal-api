import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateContractInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @Field()
  @IsUUID()
  conversationId: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  agreedPrice: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  customerAddress: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  customerLatitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  customerLongitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  deliveryCompanyId?: string;

  @Field()
  @IsString()
  @MinLength(1)
  signatureData: string;
}
