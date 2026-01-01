import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Advertisement } from '../entities/advertisement.entity';

@ObjectType()
export class PaginatedAdvertisementResponse extends Paginated(Advertisement) {}
