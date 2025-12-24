import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Contract } from '../entities/contract.entity';

@ObjectType()
export class PaginatedContractResponse extends Paginated(Contract) {}
