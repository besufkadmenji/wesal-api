import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationResolver } from './conversation.resolver';
import { MessageResolver } from './message.resolver';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Listing } from '../listing/entities/listing.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Category } from '../category/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      Listing,
      User,
      Provider,
      Category,
    ]),
  ],
  providers: [
    ConversationService,
    MessageService,
    ConversationResolver,
    MessageResolver,
  ],
  exports: [ConversationService, MessageService],
})
export class ConversationModule {}
