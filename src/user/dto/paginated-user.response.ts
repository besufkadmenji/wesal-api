import { ObjectType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';
import { Paginated } from 'lib/common/dto/paginated-response';

@ObjectType()
export class PaginatedUserResponse extends Paginated(User) {}
