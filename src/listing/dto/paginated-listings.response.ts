import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Listing } from '../entities/listing.entity';

@ObjectType()
export class PaginatedListingsResponse {
  @Field(() => [Listing])
  data: Listing[];

  @Field(() => Int)
  total: number;
}
