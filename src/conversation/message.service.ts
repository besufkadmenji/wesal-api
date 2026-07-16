import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../../lib/pubsub/pubsub.module';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateMessageInput } from './dto/create-message.input';
import { MessagePaginationInput } from './dto/message-pagination.input';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { ConversationSenderType } from './enums/sender-type.enum';
import { MESSAGE_ERROR_MESSAGES } from './errors/message.error-messages';
import { MESSAGE_ERROR_CODES } from './errors/message.error-codes';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { MessageKind } from './enums/message-kind.enum';
import { ConversationService } from './conversation.service';
import { ConversationStatus } from './enums/conversation-status.enum';

export const MESSAGE_ADDED_EVENT = 'messageAdded';

export interface MessageAddedPayload {
  messageAdded: Message;
  participants: Array<{
    id: string;
    type: ConversationSenderType.USER | ConversationSenderType.PROVIDER;
  }>;
}

/** Resolved polymorphic sender of a message. */
export type MessageSender = User | Provider;

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly conversationService: ConversationService,
  ) {}

  /** True when the principal is the customer or the provider of a conversation. */
  private isParticipant(
    conversation: Conversation,
    principal: JwtPayload,
  ): boolean {
    if (principal.type === 'provider') {
      return principal.sub === conversation.providerId;
    }
    return principal.sub === conversation.userId;
  }

  private assertParticipant(
    conversation: Conversation,
    principal: JwtPayload,
    language: LanguageCode,
  ): void {
    if (!this.isParticipant(conversation, principal)) {
      const msg = I18nService.translate(
        MESSAGE_ERROR_MESSAGES[MESSAGE_ERROR_CODES.UNAUTHORIZED_ACCESS],
        language,
      );
      throw new I18nBadRequestException({ en: msg, ar: msg }, language);
    }
  }

  async create(
    createMessageInput: CreateMessageInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Message> {
    // Validate conversation exists
    const conversation = await this.conversationRepository.findOne({
      where: { id: createMessageInput.conversationId },
    });
    if (!conversation) {
      const message = I18nService.translate(
        MESSAGE_ERROR_MESSAGES['CONVERSATION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // The sender is the authenticated principal, and must be a participant.
    this.assertParticipant(conversation, principal, language);
    const access = await this.conversationService.getAccess(
      conversation,
      principal,
      language,
    );
    if (!access.canSend) {
      const code =
        conversation.status === ConversationStatus.CLOSED
          ? MESSAGE_ERROR_CODES.CONVERSATION_CLOSED
          : MESSAGE_ERROR_CODES.CHAT_FEE_REQUIRED;
      const translated = I18nService.translate(
        MESSAGE_ERROR_MESSAGES[code],
        language,
      );
      throw new I18nBadRequestException(
        { en: translated, ar: translated },
        language,
      );
    }
    const senderType =
      principal.type === 'provider'
        ? ConversationSenderType.PROVIDER
        : ConversationSenderType.USER;

    const message = this.messageRepository.create({
      conversationId: createMessageInput.conversationId,
      senderId: principal.sub,
      senderType,
      content: createMessageInput.content,
      kind: MessageKind.TEXT,
      metadata: null,
    });
    const saved = await this.messageRepository.save(message);

    // Re-fetch (conversation relation) then publish to conversation participants.
    const populated = await this.loadById(saved.id, language);
    const payload: MessageAddedPayload = {
      messageAdded: populated,
      participants: this.participants(conversation),
    };
    await this.pubSub.publish(MESSAGE_ADDED_EVENT, payload);

    return populated;
  }

  async assertSubscriptionAccess(
    conversationId: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      const translated = I18nService.translate(
        MESSAGE_ERROR_MESSAGES[MESSAGE_ERROR_CODES.CONVERSATION_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException(
        { en: translated, ar: translated },
        language,
      );
    }
    this.assertParticipant(conversation, principal, language);
  }

  async persistSystemEvent(
    conversationId: string,
    kind: Exclude<MessageKind, MessageKind.TEXT>,
    metadata: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<MessageAddedPayload> {
    const conversationRepository = manager
      ? manager.getRepository(Conversation)
      : this.conversationRepository;
    const messageRepository = manager
      ? manager.getRepository(Message)
      : this.messageRepository;
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    const message = messageRepository.create({
      conversationId,
      senderId: null,
      senderType: ConversationSenderType.SYSTEM,
      kind,
      content: '',
      metadata,
    });
    const saved = await messageRepository.save(message);
    saved.conversation = conversation;
    return {
      messageAdded: saved,
      participants: this.participants(conversation),
    };
  }

  async publish(payload: MessageAddedPayload): Promise<void> {
    await this.pubSub.publish(MESSAGE_ADDED_EVENT, payload);
  }

  private participants(
    conversation: Conversation,
  ): MessageAddedPayload['participants'] {
    return [
      { id: conversation.userId, type: ConversationSenderType.USER },
      {
        id: conversation.providerId,
        type: ConversationSenderType.PROVIDER,
      },
    ];
  }

  async findAll(
    paginationInput: MessagePaginationInput,
    principal: JwtPayload,
  ): Promise<IPaginatedType<Message>> {
    const {
      page = 1,
      limit = 10,
      conversationId,
      senderId,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    // Messages are only readable within a conversation the caller belongs to.
    if (!conversationId) {
      const msg = I18nService.translate(
        MESSAGE_ERROR_MESSAGES[MESSAGE_ERROR_CODES.UNAUTHORIZED_ACCESS],
        'en',
      );
      throw new I18nBadRequestException({ en: msg, ar: msg }, 'en');
    }
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      const msg = I18nService.translate(
        MESSAGE_ERROR_MESSAGES['CONVERSATION_NOT_FOUND'],
        'en',
      );
      throw new I18nNotFoundException({ en: msg, ar: msg }, 'en');
    }
    this.assertParticipant(conversation, principal, 'en');

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .where('message.conversationId = :conversationId', { conversationId });

    if (senderId) {
      queryBuilder.andWhere('message.senderId = :senderId', { senderId });
    }

    const orderByField = sortBy ? `message.${sortBy}` : 'message.createdAt';
    const orderDirection = sortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(orderByField, orderDirection)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /** Internal loader (no authorization) used after create/for owner checks. */
  private async loadById(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['conversation'],
    });

    if (!message) {
      const msg = I18nService.translate(
        MESSAGE_ERROR_MESSAGES['MESSAGE_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: msg, ar: msg }, language);
    }

    return message;
  }

  async findOne(
    id: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Message> {
    const message = await this.loadById(id, language);
    this.assertParticipant(message.conversation, principal, language);
    return message;
  }

  /** Resolves the polymorphic sender entity for GraphQL @ResolveField. */
  async resolveSender(message: Message): Promise<MessageSender | null> {
    if (
      !message.senderId ||
      message.senderType === ConversationSenderType.SYSTEM
    ) {
      return null;
    }
    if (message.senderType === ConversationSenderType.PROVIDER) {
      return this.providerRepository.findOne({
        where: { id: message.senderId },
      });
    }
    return this.userRepository.findOne({ where: { id: message.senderId } });
  }
}
