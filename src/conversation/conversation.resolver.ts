import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ConversationService } from './conversation.service';
import { Conversation } from './entities/conversation.entity';
import { CreateConversationInput } from './dto/create-conversation.input';
import { UpdateConversationInput } from './dto/update-conversation.input';
import { ConversationPaginationInput } from './dto/conversation-pagination.input';
import { PaginatedConversationResponse } from './dto/paginated-conversation.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Conversation)
export class ConversationResolver {
  constructor(private readonly conversationService: ConversationService) {}

  @Mutation(() => Conversation)
  async createConversation(
    @Args('input') createConversationInput: CreateConversationInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Conversation> {
    return this.conversationService.create(createConversationInput, language);
  }

  @Query(() => PaginatedConversationResponse, { name: 'conversations' })
  async findAll(
    @Args('input', { nullable: true }) input?: ConversationPaginationInput,
  ): Promise<IPaginatedType<Conversation>> {
    return this.conversationService.findAll(input ?? {});
  }

  @Query(() => Conversation, { name: 'conversation' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Conversation> {
    return this.conversationService.findOne(id, language);
  }

  @Mutation(() => Conversation)
  async updateConversation(
    @Args('input') updateConversationInput: UpdateConversationInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Conversation> {
    return this.conversationService.update(updateConversationInput, language);
  }

  @Mutation(() => Conversation)
  async removeConversation(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Conversation> {
    return this.conversationService.remove(id, language);
  }
}
