import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationResolver } from './conversation.resolver';
import { MessageResolver } from './message.resolver';
import { ConversationController } from './conversation.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Listing } from '../listing/entities/listing.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Listing, User])],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    MessageService,
    ConversationResolver,
    MessageResolver,
  ],
  exports: [ConversationService, MessageService],
})
export class ConversationModule {}
