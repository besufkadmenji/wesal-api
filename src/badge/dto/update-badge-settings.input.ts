import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { BadgeBound } from '../enums/badge-bound.enum';
import { BadgeTier } from '../enums/badge-tier.enum';

@InputType()
export class BadgeSettingInput {
  @Field(() => BadgeTier)
  @IsEnum(BadgeTier)
  tier: BadgeTier;

  @Field(() => BadgeBound, { nullable: true })
  @IsOptional()
  @IsEnum(BadgeBound)
  maxBound?: BadgeBound | null;

  @Field(() => BadgeBound, { nullable: true })
  @IsOptional()
  @IsEnum(BadgeBound)
  minBound?: BadgeBound | null;

  @Field()
  @IsBoolean()
  enabled: boolean;
}

@InputType()
export class UpdateBadgeSettingsInput {
  @Field(() => [BadgeSettingInput])
  @ValidateNested({ each: true })
  @Type(() => BadgeSettingInput)
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  settings: BadgeSettingInput[];
}
