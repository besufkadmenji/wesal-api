import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Category } from '../entities/category.entity';

@ObjectType()
export class PaginatedCategoryResponse extends Paginated(Category) {}
