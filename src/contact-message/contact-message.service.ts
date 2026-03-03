import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from 'lib/email/email.service';
import {
  ContactMessage,
  ContactMessageStatus,
  SenderType,
} from './entities/contact-message.entity';
import { CreateContactMessageInput } from './dto/create-contact-message.input';
import { UpdateContactMessageInput } from './dto/update-contact-message.input';
import { ContactMessagePaginationInput } from './dto/contact-message-pagination.input';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class ContactMessageService {
  private readonly logger = new Logger(ContactMessageService.name);

  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactMessageRepository: Repository<ContactMessage>,
    private readonly emailService: EmailService,
  ) {}

  async create(
    createContactMessageInput: CreateContactMessageInput,
    caller?: JwtPayload,
  ): Promise<ContactMessage> {
    let senderType = SenderType.GUEST;
    let senderId: string | undefined;

    if (caller) {
      senderType =
        caller.type === 'provider' ? SenderType.PROVIDER : SenderType.USER;
      senderId = caller.sub;
    }

    const message = this.contactMessageRepository.create({
      ...createContactMessageInput,
      senderType,
      senderId,
    });
    return this.contactMessageRepository.save(message);
  }

  async findAll(
    paginationInput: ContactMessagePaginationInput,
  ): Promise<IPaginatedType<ContactMessage>> {
    const page = paginationInput.page ?? 1;
    const limit = paginationInput.limit ?? 10;
    const sortOrder = (paginationInput.sortOrder ?? 'DESC') as 'ASC' | 'DESC';
    const sortBy = paginationInput.sortBy ?? 'createdAt';

    const qb =
      this.contactMessageRepository.createQueryBuilder('contactMessage');

    if (paginationInput?.search) {
      qb.andWhere(
        '(contactMessage.name ILIKE :search OR contactMessage.email ILIKE :search OR contactMessage.phone ILIKE :search OR contactMessage.messageContent ILIKE :search)',
        { search: `%${paginationInput.search}%` },
      );
    }

    if (paginationInput?.status) {
      qb.andWhere('contactMessage.status = :status', {
        status: paginationInput.status as string,
      });
    }

    if (paginationInput?.senderType) {
      qb.andWhere('contactMessage.senderType = :senderType', {
        senderType: paginationInput.senderType as string,
      });
    }
    if (paginationInput?.messageType) {
      qb.andWhere('contactMessage.messageType = :messageType', {
        messageType: paginationInput.messageType,
      });
    }

    if (paginationInput?.dateFrom) {
      qb.andWhere('contactMessage.createdAt >= :dateFrom', {
        dateFrom: paginationInput.dateFrom,
      });
    }

    if (paginationInput?.dateTo) {
      qb.andWhere('contactMessage.createdAt <= :dateTo', {
        dateTo: paginationInput.dateTo,
      });
    }

    const skip = (page - 1) * limit;

    qb.orderBy(`contactMessage.${sortBy}`, sortOrder)
      .skip(skip)
      .take(Number(limit));

    const [items, total] = await qb.getManyAndCount();

    const totalPages = Math.max(1, Math.ceil(total / limit));

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

  async findOne(id: string): Promise<ContactMessage> {
    const message = await this.contactMessageRepository.findOneBy({ id });
    if (!message) {
      throw new Error('Contact message not found');
    }
    return message;
  }

  async update(
    id: string,
    updateContactMessageInput: UpdateContactMessageInput,
  ): Promise<ContactMessage> {
    await this.contactMessageRepository.update(id, updateContactMessageInput);
    return this.findOne(id);
  }

  async reply(
    id: string,
    message: string,
    language: 'en' | 'ar' = 'en',
  ): Promise<ContactMessage> {
    const contactMessage = await this.findOne(id);
    await this.contactMessageRepository.update(id, {
      reply: message,
      status: ContactMessageStatus.REPLIED,
    });

    // Send reply email to the user
    await this.emailService.sendContactReplyEmail(
      contactMessage.email,
      contactMessage.messageContent,
      message,
      language,
      contactMessage.name,
    );

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.contactMessageRepository.delete(id);
  }

  async markAsRead(id: string): Promise<ContactMessage> {
    await this.contactMessageRepository.update(id, {
      status: ContactMessageStatus.READ,
    });
    return this.findOne(id);
  }
}
