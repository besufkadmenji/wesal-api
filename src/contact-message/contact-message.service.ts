import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageInput } from './dto/create-contact-message.input';
import { UpdateContactMessageInput } from './dto/update-contact-message.input';

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

  async findAll(): Promise<ContactMessage[]> {
    return this.contactMessageRepository.find({
      order: { createdAt: 'DESC' },
    });
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
