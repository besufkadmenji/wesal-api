import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateConversationInput } from './dto/create-conversation.input';
import { ConversationPaginationInput } from './dto/conversation-pagination.input';
import { Conversation } from './entities/conversation.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Provider } from '../provider/entities/provider.entity';
import { CONVERSATION_ERROR_MESSAGES } from './errors/conversation.error-messages';
import { CONVERSATION_ERROR_CODES } from './errors/conversation.error-codes';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Category } from '../category/entities/category.entity';
import { Message } from './entities/message.entity';
import { ConversationStats } from './dto/conversation-stats.response';
import { ConversationAccess } from './dto/conversation-access.response';
import { ConversationSenderType } from './enums/sender-type.enum';
import { ConversationStatus } from './enums/conversation-status.enum';
import { SettingService } from '../setting/setting.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import { notificationTexts } from '../notification/notification-texts';
import { isCategoryActive } from '../category/category-active';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly settingService: SettingService,
    @Optional()
    private readonly notifications?: NotificationService,
  ) {}

  /**
   * Throws UNAUTHORIZED_ACCESS unless the principal is a participant of the
   * conversation: the customer (User === userId) or the provider
   * (Provider === providerId).
   */
  assertParticipant(
    conversation: Conversation,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): void {
    const isCustomer =
      principal.type === 'user' && principal.sub === conversation.userId;
    const isProvider =
      principal.type === 'provider' &&
      principal.sub === conversation.providerId;
    if (!isCustomer && !isProvider) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES[
          CONVERSATION_ERROR_CODES.UNAUTHORIZED_ACCESS
        ],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }
  }

  async create(
    createConversationInput: CreateConversationInput,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Conversation> {
    // Only a customer (User) can start a conversation with a provider's listing.
    if (principal.type !== 'user') {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES[
          CONVERSATION_ERROR_CODES.UNAUTHORIZED_ACCESS
        ],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate listing exists; the provider participant is the listing owner.
    const listing = await this.listingRepository.findOne({
      where: { id: createConversationInput.listingId },
    });
    if (!listing) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES['LISTING_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate provider (listing owner) exists
    const provider = await this.providerRepository.findOne({
      where: { id: listing.providerId },
    });
    if (!provider) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES['PROVIDER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check for duplicate conversation (same customer + listing + provider)
    const existingConversation = await this.conversationRepository.findOne({
      where: {
        listingId: createConversationInput.listingId,
        userId: principal.sub,
        providerId: listing.providerId,
      },
    });

    if (existingConversation) {
      return this.findHydratedConversation(existingConversation.id, language);
    }

    // S4-56: no new chats on an inactive category's ads.
    if (
      !(await isCategoryActive(this.categoryRepository, listing.categoryId))
    ) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES[CONVERSATION_ERROR_CODES.CATEGORY_INACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const expiresAt = await this.dealWindowEnd(listing.categoryId);
    const conversation = this.conversationRepository.create({
      listingId: createConversationInput.listingId,
      userId: principal.sub,
      providerId: listing.providerId,
      expiresAt,
      closedAt: null,
      closeReason: null,
      feeCycle: 1,
      lastActivityAt: new Date(),
    });
    const savedConversation =
      await this.conversationRepository.save(conversation);
    await this.notifyStarted(savedConversation, listing.name);
    return this.findHydratedConversation(savedConversation.id, language);
  }

  private async findHydratedConversation(
    id: string,
    language: LanguageCode,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: {
        listing: {
          category: true,
          provider: true,
        },
        user: true,
        provider: true,
      },
    });

    if (!conversation) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES['CONVERSATION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return conversation;
  }

  async findAll(
    paginationInput: ConversationPaginationInput,
    // Optional: the GraphQL resolver always passes a principal (guard-enforced)
    // so results are scoped to the caller. The admin CSV-export controller
    // calls this without a principal to export all conversations.
    principal?: JwtPayload,
  ): Promise<IPaginatedType<Conversation>> {
    const {
      page = 1,
      limit = 10,
      listingId,
      status,
      search,
      from,
      to,
      sortBy,
      sortOrder,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.listing', 'listing')
      .leftJoinAndSelect('conversation.user', 'user')
      .leftJoinAndSelect('conversation.provider', 'provider');

    // Scope to the caller's own conversations (customer or provider side).
    if (principal) {
      if (principal.type === 'provider') {
        queryBuilder.andWhere('conversation.providerId = :principalId', {
          principalId: principal.sub,
        });
      } else {
        queryBuilder.andWhere('conversation.userId = :principalId', {
          principalId: principal.sub,
        });
      }
    }

    if (listingId) {
      queryBuilder.andWhere('conversation.listingId = :listingId', {
        listingId,
      });
    }

    if (status) {
      queryBuilder.andWhere('conversation.status = :status', { status });
    }
    if (search?.trim()) {
      queryBuilder.andWhere(
        `(conversation."publicId"::text ILIKE :search
          OR user.name ILIKE :search
          OR user.phone ILIKE :search
          OR provider.name ILIKE :search
          OR provider."commercialName" ILIKE :search
          OR provider.phone ILIKE :search
          OR listing.name ILIKE :search)`,
        { search: `%${search.trim()}%` },
      );
    }
    if (from) {
      queryBuilder.andWhere('conversation.createdAt >= :from', { from });
    }
    if (to) {
      queryBuilder.andWhere('conversation.createdAt <= :to', { to });
    }

    const orderByField = sortBy
      ? `conversation.${sortBy}`
      : principal
        ? 'conversation.lastActivityAt'
        : 'conversation.createdAt';
    const effectiveSortOrder =
      sortOrder ?? (principal ? SortOrder.DESC : SortOrder.ASC);
    const orderDirection =
      effectiveSortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

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

  async findOne(
    id: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['listing', 'user', 'provider', 'messages'],
    });

    if (!conversation) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES['CONVERSATION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    this.assertParticipant(conversation, principal, language);
    return this.enforceExpiry(conversation);
  }

  async findOneAdmin(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['listing', 'user', 'provider', 'messages'],
    });
    if (!conversation) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES['CONVERSATION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }
    return this.enforceExpiry(conversation);
  }

  async getAccess(
    conversation: Conversation,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<ConversationAccess> {
    this.assertParticipant(conversation, principal, language);
    conversation = await this.enforceExpiry(conversation);
    const listing =
      conversation.listing ??
      (await this.listingRepository.findOne({
        where: { id: conversation.listingId },
      }));
    const category = listing
      ? await this.categoryRepository.findOne({
          where: { id: listing.categoryId },
        })
      : null;

    const isProvider = principal.type === 'provider';
    const enabled = isProvider
      ? Boolean(category?.providerConversationFeeEnabled)
      : Boolean(category?.customerConversationFeeEnabled);
    const amount = Number(
      isProvider
        ? (category?.providerConversationFee ?? 0)
        : (category?.customerConversationFee ?? 0),
    );
    const paidAt = isProvider
      ? conversation.providerFeePaidAt
      : conversation.customerFeePaidAt;
    const feeRequired = enabled && amount > 0;

    return {
      feeRequired,
      feeAmount: amount,
      paidAt,
      canSend:
        conversation.status === ConversationStatus.ACTIVE &&
        (!feeRequired || Boolean(paidAt)),
      expiresAt: conversation.expiresAt,
      feeCycle: conversation.feeCycle,
    };
  }

  async restart(
    id: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Conversation> {
    const conversation = await this.findOne(id, principal, language);
    if (
      conversation.status !== ConversationStatus.CLOSED ||
      conversation.closeReason !== 'EXPIRED'
    ) {
      throw new I18nBadRequestException(
        {
          en: 'Only an expired conversation can be restarted',
          ar: 'يمكن إعادة تشغيل المحادثة المنتهية فقط',
        },
        language,
      );
    }
    conversation.status = ConversationStatus.ACTIVE;
    conversation.closedAt = null;
    conversation.closeReason = null;
    conversation.feeCycle += 1;
    conversation.customerFeePaidAt = null;
    conversation.providerFeePaidAt = null;
    conversation.customerLastReadAt = null;
    conversation.providerLastReadAt = null;
    conversation.lastActivityAt = new Date();
    conversation.expiresAt = await this.dealWindowEnd(
      conversation.listing?.categoryId,
    );
    const restarted = await this.conversationRepository.save(conversation);
    await this.notifyStarted(restarted, conversation.listing?.name);
    return restarted;
  }

  /**
   * S4-2: the window both parties have to accept and pay a contract after the
   * chat fee (BRD "maximum time limit for contract termination"): the
   * category's hours when enabled, else the Settings acceptance window.
   * Paying a contract clears it (ContractService.transitionAfterPayment).
   */
  private async dealWindowEnd(
    categoryId: string | null | undefined,
  ): Promise<Date | null> {
    const category = categoryId
      ? await this.categoryRepository.findOne({ where: { id: categoryId } })
      : null;
    if (category?.maxTerminationHoursEnabled && category.maxTerminationHours) {
      return new Date(Date.now() + category.maxTerminationHours * 3_600_000);
    }
    const setting = await this.settingService.getSetting();
    return setting.contractAcceptanceWindowEnabled
      ? new Date(Date.now() + setting.contractAcceptanceWindowDays * 86_400_000)
      : null;
  }

  private async enforceExpiry(
    conversation: Conversation,
  ): Promise<Conversation> {
    if (
      conversation.status === ConversationStatus.ACTIVE &&
      conversation.expiresAt &&
      conversation.expiresAt.getTime() <= Date.now()
    ) {
      conversation.status = ConversationStatus.CLOSED;
      conversation.closedAt = new Date();
      conversation.closeReason = 'EXPIRED';
      const closed = await this.conversationRepository.save(conversation);
      await this.notifyEnded([closed]);
      return closed;
    }
    return conversation;
  }

  @Interval(60_000)
  async closeExpiredConversations(): Promise<void> {
    // Select first so each closed conversation can notify its participants.
    const expiring = await this.conversationRepository.find({
      where: {
        status: ConversationStatus.ACTIVE,
        expiresAt: LessThanOrEqual(new Date()),
      },
      select: { id: true, userId: true, providerId: true, listingId: true },
    });
    if (expiring.length === 0) return;
    await this.conversationRepository.update(
      { id: In(expiring.map((conversation) => conversation.id)) },
      {
        status: ConversationStatus.CLOSED,
        closedAt: new Date(),
        closeReason: 'EXPIRED',
      },
    );
    await this.notifyEnded(expiring);
  }

  /** S4-38: the provider learns a customer opened (or reopened) a chat. */
  private async notifyStarted(
    conversation: Pick<Conversation, 'id' | 'providerId' | 'listingId'>,
    listingName?: string,
  ): Promise<void> {
    if (!this.notifications) return;
    const name =
      listingName ??
      (
        await this.listingRepository.findOne({
          where: { id: conversation.listingId },
          select: { id: true, name: true },
        })
      )?.name ??
      '';
    await this.notifications.notifyLocalized({
      recipientId: conversation.providerId,
      recipientType: NotificationRecipientType.PROVIDER,
      type: NotificationType.CHAT_STARTED,
      text: notificationTexts.chatStarted(name),
      relatedEntityId: conversation.id,
      relatedEntityType: 'conversation',
    });
  }

  /** S4-38: both participants learn an expired chat has ended. */
  private async notifyEnded(
    conversations: Array<
      Pick<Conversation, 'id' | 'userId' | 'providerId' | 'listingId'>
    >,
  ): Promise<void> {
    if (!this.notifications) return;
    try {
      const listings = await this.listingRepository.find({
        where: { id: In(conversations.map((c) => c.listingId)) },
        select: { id: true, name: true },
      });
      const names = new Map(listings.map((l) => [l.id, l.name]));
      for (const conversation of conversations) {
        const text = notificationTexts.chatEnded(
          names.get(conversation.listingId) ?? '',
        );
        for (const [recipientId, recipientType] of [
          [conversation.userId, NotificationRecipientType.USER],
          [conversation.providerId, NotificationRecipientType.PROVIDER],
        ] as const) {
          await this.notifications.notifyLocalized({
            recipientId,
            recipientType,
            type: NotificationType.CHAT_ENDED,
            text,
            relatedEntityId: conversation.id,
            relatedEntityType: 'conversation',
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Chat-ended notifications failed: ${String(error)}`);
    }
  }

  async markRead(
    id: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Conversation> {
    const conversation = await this.findOne(id, principal, language);
    if (principal.type === 'provider') {
      conversation.providerLastReadAt = new Date();
    } else {
      conversation.customerLastReadAt = new Date();
    }
    return this.conversationRepository.save(conversation);
  }

  async getLastMessage(conversationId: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(
    conversation: Conversation,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<number> {
    this.assertParticipant(conversation, principal, language);
    const lastReadAt =
      principal.type === 'provider'
        ? conversation.providerLastReadAt
        : conversation.customerLastReadAt;
    const senderType =
      principal.type === 'provider'
        ? ConversationSenderType.PROVIDER
        : ConversationSenderType.USER;
    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', {
        conversationId: conversation.id,
      })
      .andWhere(
        '(message.senderType != :senderType OR message.senderId IS NULL OR message.senderId != :senderId)',
        { senderType, senderId: principal.sub },
      );
    if (lastReadAt) {
      query.andWhere('message.createdAt > :lastReadAt', { lastReadAt });
    }
    return query.getCount();
  }

  async getStats(principal: JwtPayload): Promise<ConversationStats> {
    const isProvider = principal.type === 'provider';
    const participantField = isProvider ? 'providerId' : 'userId';
    const lastReadField = isProvider
      ? 'providerLastReadAt'
      : 'customerLastReadAt';
    const senderType = isProvider
      ? ConversationSenderType.PROVIDER
      : ConversationSenderType.USER;

    const unreadCount = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin(
        Conversation,
        'conversation',
        'conversation.id = message.conversationId',
      )
      .where(`conversation.${participantField} = :principalId`, {
        principalId: principal.sub,
      })
      .andWhere(
        '(message.senderType != :senderType OR message.senderId IS NULL OR message.senderId != :principalId)',
        { senderType, principalId: principal.sub },
      )
      .andWhere(
        `(conversation.${lastReadField} IS NULL OR message.createdAt > conversation.${lastReadField})`,
      )
      .getCount();

    return { unreadCount };
  }
}
