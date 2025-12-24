import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Message } from '../entities/message.entity';

@ObjectType()
export class PaginatedMessageResponse extends Paginated(Message) {}
