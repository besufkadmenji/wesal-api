import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationResolver } from './conversation.resolver';
import { MessageResolver } from './message.resolver';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Advertisement } from '../advertisement/entities/advertisement.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Advertisement, User]),
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
