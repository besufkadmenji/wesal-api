import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Bank } from '../entities/bank.entity';

@ObjectType()
export class PaginatedBankResponse extends Paginated(Bank) {}
