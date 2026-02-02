import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationMeta } from '../../../lib/common/dto/paginated-response';
import { Provider } from '../entities/provider.entity';

@ObjectType()
export class PaginatedProviderResponse {
  @Field(() => [Provider])
  items: Provider[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
