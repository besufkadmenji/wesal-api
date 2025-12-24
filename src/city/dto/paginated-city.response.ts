import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { City } from '../entities/city.entity';

@ObjectType()
export class PaginatedCityResponse extends Paginated(City) {}
