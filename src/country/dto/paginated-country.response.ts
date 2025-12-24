import { ObjectType } from '@nestjs/graphql';
import { Country } from '../entities/country.entity';
import { Paginated } from 'lib/common/dto/paginated-response';

@ObjectType()
export class PaginatedCountryResponse extends Paginated(Country) {}
