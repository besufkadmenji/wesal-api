import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const RATING_COMMENT_MAX_LENGTH = 1000;

@InputType()
export class RateContractInput {
  @Field()
  @IsUUID()
  contractId: string;

  @Field(() => Int, { description: 'Stars from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @Field({ nullable: true, description: 'Optional comment, max 1000 chars' })
  @IsOptional()
  @IsString()
  @MaxLength(RATING_COMMENT_MAX_LENGTH)
  comment?: string;
}
