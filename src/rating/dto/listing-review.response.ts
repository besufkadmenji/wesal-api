import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';

/** Public view of a published rating; exposes no reviewer contact data. */
@ObjectType()
export class ListingReview {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  rating: number;

  @Field(() => String, { nullable: true })
  comment: string | null;

  @Field(() => String, { nullable: true })
  reviewerName: string | null;

  @Field(() => String, { nullable: true })
  reviewerAvatarFilename: string | null;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PaginatedListingReviewResponse extends Paginated(ListingReview) {}
