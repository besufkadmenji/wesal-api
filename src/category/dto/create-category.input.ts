import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class CreateCategoryInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  image: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  nameEn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  nameAr: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  descriptionEn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  descriptionAr: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  rulesAr?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  rulesEn?: string;

  // --- Per-section fee & contract rules (admin-editable) ---
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  commissionEnabled?: boolean;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minCommissionAmount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  minCommissionEnabled?: boolean;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercent?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  depositEnabled?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCompletionDays?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  maxCompletionDaysEnabled?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTerminationDays?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  maxTerminationDaysEnabled?: boolean;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customerConversationFee?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  customerConversationFeeEnabled?: boolean;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  providerConversationFee?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  providerConversationFeeEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  contractDocumentEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contractDocumentText?: string;
}
