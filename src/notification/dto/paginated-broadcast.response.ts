import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { NotificationBroadcast } from '../entities/notification-broadcast.entity';

@ObjectType()
export class PaginatedBroadcastResponse extends Paginated(
  NotificationBroadcast,
) {}
