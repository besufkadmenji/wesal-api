import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MessageService } from './message.service';
import { Message } from './entities/message.entity';
import { CreateMessageInput } from './dto/create-message.input';
import { UpdateMessageInput } from './dto/update-message.input';
import { MessagePaginationInput } from './dto/message-pagination.input';
import { PaginatedMessageResponse } from './dto/paginated-message.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Message)
export class MessageResolver {
  constructor(private readonly messageService: MessageService) {}

  @Mutation(() => Message)
  async createMessage(
    @Args('input') createMessageInput: CreateMessageInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Message> {
    return this.messageService.create(createMessageInput, language);
  }

  @Query(() => PaginatedMessageResponse, { name: 'messages' })
  async findAll(
    @Args('input', { nullable: true }) input?: MessagePaginationInput,
  ): Promise<IPaginatedType<Message>> {
    return this.messageService.findAll(input ?? {});
  }

  @Query(() => Message, { name: 'message' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Message> {
    return this.messageService.findOne(id, language);
  }

  @Mutation(() => Message)
  async updateMessage(
    @Args('input') updateMessageInput: UpdateMessageInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Message> {
    return this.messageService.update(updateMessageInput, language);
  }

  @Mutation(() => Message)
  async removeMessage(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Message> {
    return this.messageService.remove(id, language);
  }
}
