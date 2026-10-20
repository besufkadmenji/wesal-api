import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

@InputType()
export class ListingReviewsInput {
  @Field()
  @IsUUID()
  listingId: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
