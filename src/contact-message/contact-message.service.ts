import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageInput } from './dto/create-contact-message.input';
import { UpdateContactMessageInput } from './dto/update-contact-message.input';
import { ContactMessagePaginationInput } from './dto/contact-message-pagination.input';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Injectable()
export class ContactMessageService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactMessageRepository: Repository<ContactMessage>,
  ) {}

  async create(
    createContactMessageInput: CreateContactMessageInput,
  ): Promise<ContactMessage> {
    const message = this.contactMessageRepository.create(
      createContactMessageInput,
    );
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

    if (typeof paginationInput?.isRead === 'boolean') {
      qb.andWhere('contactMessage.isRead = :isRead', {
        isRead: paginationInput.isRead,
      });
    }

    if (paginationInput?.messageType) {
      qb.andWhere('contactMessage.messageType = :messageType', {
        messageType: paginationInput.messageType,
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

  async remove(id: string): Promise<void> {
    await this.contactMessageRepository.delete(id);
  }

  async markAsRead(id: string): Promise<ContactMessage> {
    await this.contactMessageRepository.update(id, { isRead: true });
    return this.findOne(id);
  }
}
