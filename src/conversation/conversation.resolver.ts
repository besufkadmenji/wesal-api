import { UseGuards } from '@nestjs/common';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Int,
} from '@nestjs/graphql';
import { ConversationService } from './conversation.service';
import { Conversation } from './entities/conversation.entity';
import { CreateConversationInput } from './dto/create-conversation.input';
import { ConversationPaginationInput } from './dto/conversation-pagination.input';
import { PaginatedConversationResponse } from './dto/paginated-conversation.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ConversationAccess } from './dto/conversation-access.response';
import { Message } from './entities/message.entity';

@Resolver(() => Conversation)
@UseGuards(JwtAuthGuard)
export class ConversationResolver {
  constructor(private readonly conversationService: ConversationService) {}

  @Mutation(() => Conversation)
  async createConversation(
    @Args('input') createConversationInput: CreateConversationInput,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Conversation> {
    return this.conversationService.create(
      createConversationInput,
      principal,
      language,
    );
  }

  @Query(() => PaginatedConversationResponse, { name: 'conversations' })
  async findAll(
    @CurrentPrincipal() principal: JwtPayload,
    @Args('input', { nullable: true }) input?: ConversationPaginationInput,
  ): Promise<IPaginatedType<Conversation>> {
    return this.conversationService.findAll(input ?? {}, principal);
  }

  @Query(() => Conversation, { name: 'conversation' })
  async findOne(
    @Args('id') id: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Conversation> {
    return this.conversationService.findOne(id, principal, language);
  }

  @Mutation(() => Conversation, {
    description: 'Mark the conversation as read for the authenticated side',
  })
  async markConversationRead(
    @Args('conversationId') conversationId: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Conversation> {
    return this.conversationService.markRead(
      conversationId,
      principal,
      language,
    );
  }

  @ResolveField(() => ConversationAccess)
  async access(
    @Parent() conversation: Conversation,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<ConversationAccess> {
    return this.conversationService.getAccess(
      conversation,
      principal,
      language,
    );
  }

  @ResolveField(() => Message, { nullable: true })
  async lastMessage(
    @Parent() conversation: Conversation,
  ): Promise<Message | null> {
    return this.conversationService.getLastMessage(conversation.id);
  }

  @ResolveField(() => Int)
  async unreadCount(
    @Parent() conversation: Conversation,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<number> {
    return this.conversationService.getUnreadCount(
      conversation,
      principal,
      language,
    );
  }
}
