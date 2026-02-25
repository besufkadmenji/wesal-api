import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateConversationInput } from './dto/create-conversation.input';
import { UpdateConversationInput } from './dto/update-conversation.input';
import { ConversationPaginationInput } from './dto/conversation-pagination.input';
import { Conversation } from './entities/conversation.entity';
import { Listing } from '../listing/entities/listing.entity';
import { User } from '../user/entities/user.entity';
import { CONVERSATION_ERROR_MESSAGES } from './errors/conversation.error-messages';
import { CONVERSATION_ERROR_CODES } from './errors/conversation.error-codes';
import { Contract } from '../contract/entities/contract.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
  ) {}

  async create(
    createConversationInput: CreateConversationInput,
    language: LanguageCode = 'en',
  ): Promise<Conversation> {
    // Validate listing exists
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

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createConversationInput.userId },
    });
    if (!user) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate provider exists
    const provider = await this.userRepository.findOne({
      where: { id: createConversationInput.providerId },
    });
    if (!provider) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES['PROVIDER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check for duplicate conversation
    const existingConversation = await this.conversationRepository.findOne({
      where: {
        listingId: createConversationInput.listingId,
        userId: createConversationInput.userId,
        providerId: createConversationInput.providerId,
      },
    });

    if (existingConversation) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES['DUPLICATE_CONVERSATION'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const conversation = this.conversationRepository.create(
      createConversationInput,
    );
    return await this.conversationRepository.save(conversation);
  }

  async findAll(
    paginationInput: ConversationPaginationInput,
  ): Promise<IPaginatedType<Conversation>> {
    const {
      page = 1,
      limit = 10,
      listingId,
      userId,
      providerId,
      isPaid,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.listing', 'listing')
      .leftJoinAndSelect('conversation.user', 'user')
      .leftJoinAndSelect('conversation.provider', 'provider')
      .leftJoinAndSelect('conversation.messages', 'messages');

    if (listingId) {
      queryBuilder.andWhere('conversation.listingId = :listingId', {
        listingId,
      });
    }

    if (userId) {
      queryBuilder.andWhere('conversation.userId = :userId', { userId });
    }

    if (providerId) {
      queryBuilder.andWhere('conversation.providerId = :providerId', {
        providerId,
      });
    }

    if (isPaid !== undefined) {
      queryBuilder.andWhere('conversation.isPaid = :isPaid', { isPaid });
    }

    const orderByField = sortBy
      ? `conversation.${sortBy}`
      : 'conversation.createdAt';
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

  async findOne(
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

    return conversation;
  }

  async update(
    updateConversationInput: UpdateConversationInput,
    language: LanguageCode = 'en',
  ): Promise<Conversation> {
    const conversation = await this.findOne(
      updateConversationInput.id,
      language,
    );

    Object.assign(conversation, updateConversationInput);
    return await this.conversationRepository.save(conversation);
  }

  async remove(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Conversation> {
    const conversation = await this.findOne(id, language);

    const contractCount = await this.contractRepository.count({ where: { conversationId: id } });
    if (contractCount > 0) {
      const message = I18nService.translate(
        CONVERSATION_ERROR_MESSAGES[CONVERSATION_ERROR_CODES.CONVERSATION_HAS_CONTRACTS],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    await this.conversationRepository.remove(conversation);
    return conversation;
  }
}
