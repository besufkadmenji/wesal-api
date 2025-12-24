import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Rating } from '../entities/rating.entity';

@ObjectType()
export class PaginatedRatingResponse extends Paginated(Rating) {}
