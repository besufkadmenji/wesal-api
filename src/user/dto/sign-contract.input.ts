import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class SignContractInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  serviceProviderName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  platformManagerName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  commercialName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  dialCode: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  categoryNameEn: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  categoryNameAr: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  address: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  serviceProviderSignature: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  platformManagerSignature: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  verifiedWithAbsher?: boolean;
}
