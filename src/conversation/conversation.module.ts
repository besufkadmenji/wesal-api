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
import { SettingModule } from '../setting/setting.module';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';

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
    SettingModule,
    AdminPermissionGuardModule,
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
