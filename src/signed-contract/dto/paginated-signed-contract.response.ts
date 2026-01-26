import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { SignedContract } from '../signed-contract.entity';

@ObjectType()
export class PaginatedSignedContractResponse extends Paginated(
  SignedContract,
) {}
