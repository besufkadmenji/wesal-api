import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { DeliveryCompany } from '../entities/delivery-company.entity';

@ObjectType()
export class PaginatedDeliveryCompanyResponse extends Paginated(DeliveryCompany) {}
