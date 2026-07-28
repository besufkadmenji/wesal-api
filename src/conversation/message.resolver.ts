import { Inject, UseGuards } from '@nestjs/common';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Subscription,
  ResolveField,
  Parent,
  createUnionType,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../../lib/pubsub/pubsub.module';
import { MessageService, MESSAGE_ADDED_EVENT } from './message.service';
import type { MessageAddedPayload } from './message.service';
import { Message } from './entities/message.entity';
import { CreateMessageInput } from './dto/create-message.input';
import { MessagePaginationInput } from './dto/message-pagination.input';
import { PaginatedMessageResponse } from './dto/paginated-message.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';
import { ConversationSenderType } from './enums/sender-type.enum';

export const MessageSender = createUnionType({
  name: 'MessageSender',
  types: () => [User, Provider] as const,
  resolveType: (value: User | Provider) =>
    value instanceof Provider ? Provider : User,
});

export const isMessagePayloadParticipant = (
  payload: MessageAddedPayload,
  principal: JwtPayload,
) =>
  payload.participants.some(
    (participant) =>
      participant.id === principal.sub &&
      participant.type ===
        (principal.type === 'provider'
          ? ConversationSenderType.PROVIDER
          : ConversationSenderType.USER),
  );

@Resolver(() => Message)
export class MessageResolver {
  constructor(
    private readonly messageService: MessageService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => Message)
  @UseGuards(JwtAuthGuard)
  async createMessage(
    @Args('input') createMessageInput: CreateMessageInput,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Message> {
    return this.messageService.create(createMessageInput, principal, language);
  }

  @Query(() => PaginatedMessageResponse, { name: 'messages' })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentPrincipal() principal: JwtPayload,
    @Args('input', { nullable: true }) input?: MessagePaginationInput,
  ): Promise<IPaginatedType<Message>> {
    return this.messageService.findAll(input ?? {}, principal);
  }

  @Query(() => Message, { name: 'message' })
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Args('id') id: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Message> {
    return this.messageService.findOne(id, principal, language);
  }

  @ResolveField(() => MessageSender, {
    nullable: true,
    description: 'The message sender, either a User (customer) or a Provider',
  })
  async sender(@Parent() message: Message): Promise<User | Provider | null> {
    return this.messageService.resolveSender(message);
  }

  @Subscription(() => Message, {
    description:
      'Subscribe to new messages in a conversation (participants only)',
    filter: (
      payload: MessageAddedPayload,
      variables: { conversationId: string },
      context: { principal: JwtPayload },
    ) =>
      payload.messageAdded.conversationId === variables.conversationId &&
      isMessagePayloadParticipant(payload, context.principal),
  })
  @UseGuards(WsJwtAuthGuard)
  async messageAdded(
    @Args('conversationId') conversationId: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    await this.messageService.assertSubscriptionAccess(
      conversationId,
      principal,
      language,
    );
    return this.pubSub.asyncIterableIterator(MESSAGE_ADDED_EVENT);
  }

  @Subscription(() => Message, {
    description:
      'Subscribe to all new messages for the authenticated participant',
    filter: (
      payload: MessageAddedPayload,
      _variables: Record<string, never>,
      context: { principal: JwtPayload },
    ) => isMessagePayloadParticipant(payload, context.principal),
    resolve: (payload: MessageAddedPayload) => payload.messageAdded,
  })
  @UseGuards(WsJwtAuthGuard)
  participantMessageAdded() {
    return this.pubSub.asyncIterableIterator(MESSAGE_ADDED_EVENT);
  }
}
