import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Conversation } from '../entities/conversation.entity';

@ObjectType()
export class PaginatedConversationResponse extends Paginated(Conversation) {}
