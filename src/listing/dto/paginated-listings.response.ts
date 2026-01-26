import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'lib/common/dto/paginated-response';
import { Listing } from '../entities/listing.entity';

@ObjectType()
export class PaginatedListingResponse extends Paginated(Listing) {}
