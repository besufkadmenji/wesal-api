import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Contract } from '../contract/entities/contract.entity';
import { Rating } from './entities/rating.entity';
import { RatingService } from './rating.service';

/**
 * Adds `Contract.rating`. Contract queries are already scoped to their
 * participants or to admins, so the rating inherits that visibility.
 */
@Resolver(() => Contract)
export class ContractRatingResolver {
  constructor(private readonly ratingService: RatingService) {}

  @ResolveField('rating', () => Rating, { nullable: true })
  rating(@Parent() contract: Contract): Promise<Rating | null> {
    return this.ratingService.findForContract(contract.id);
  }
}
