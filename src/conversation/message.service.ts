import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nNotFoundException } from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateMessageInput } from './dto/create-message.input';
import { UpdateMessageInput } from './dto/update-message.input';
import { MessagePaginationInput } from './dto/message-pagination.input';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { User } from '../user/entities/user.entity';
import { MESSAGE_ERROR_MESSAGES } from './errors/message.error-messages';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createMessageInput: CreateMessageInput,
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

    // Validate sender exists
    const sender = await this.userRepository.findOne({
      where: { id: createMessageInput.senderId },
    });
    if (!sender) {
      const message = I18nService.translate(
        MESSAGE_ERROR_MESSAGES['SENDER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    const message = this.messageRepository.create(createMessageInput);
    return await this.messageRepository.save(message);
  }

  async findAll(
    paginationInput: MessagePaginationInput,
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

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('message.sender', 'sender');

    if (conversationId) {
      queryBuilder.andWhere('message.conversationId = :conversationId', {
        conversationId,
      });
    }

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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['conversation', 'sender'],
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

  async update(
    updateMessageInput: UpdateMessageInput,
    language: LanguageCode = 'en',
  ): Promise<Message> {
    const message = await this.findOne(updateMessageInput.id, language);

    Object.assign(message, updateMessageInput);
    return await this.messageRepository.save(message);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Message> {
    const message = await this.findOne(id, language);
    await this.messageRepository.remove(message);
    return message;
  }
}
