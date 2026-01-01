import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Notification } from '../entities/notification.entity';

@ObjectType()
export class PaginatedNotificationResponse extends Paginated(Notification) {}
