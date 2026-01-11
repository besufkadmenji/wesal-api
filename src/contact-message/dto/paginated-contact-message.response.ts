import { ObjectType } from '@nestjs/graphql';
import { ContactMessage } from '../entities/contact-message.entity';
import { Paginated } from 'lib/common/dto/paginated-response';

@ObjectType()
export class PaginatedContactMessageResponse extends Paginated(
  ContactMessage,
) {}
