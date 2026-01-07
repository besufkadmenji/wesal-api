import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Admin } from '../entities/admin.entity';

@ObjectType()
export class PaginatedAdminResponse extends Paginated(Admin) {}
