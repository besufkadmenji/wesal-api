import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Favorite } from '../entities/favorite.entity';

@ObjectType()
export class PaginatedFavoriteResponse extends Paginated(Favorite) {}
