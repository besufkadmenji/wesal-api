import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class RatingStatistics {
  @Field(() => Float)
  averageRating: number;

  @Field(() => Int)
  totalRatings: number;

  @Field(() => Int)
  fiveStars: number;

  @Field(() => Int)
  fourStars: number;

  @Field(() => Int)
  threeStars: number;

  @Field(() => Int)
  twoStars: number;

  @Field(() => Int)
  oneStar: number;
}
