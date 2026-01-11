import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { CreateFaqInput } from './dto/create-faq.input';
import { UpdateFaqInput } from './dto/update-faq.input';
import { BulkUpdateFaqOrderInput } from './dto/bulk-update-faq-order.input';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>,
  ) {}

  async create(createFaqInput: CreateFaqInput): Promise<Faq> {
    const faq = this.faqRepository.create(createFaqInput);
    return this.faqRepository.save(faq);
  }

  async findAll(): Promise<Faq[]> {
    return this.faqRepository.find({
      where: { isActive: true },
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Faq> {
    const faq = await this.faqRepository.findOneBy({ id });
    if (!faq) {
      throw new Error('FAQ not found');
    }
    return faq;
  }

  async update(id: string, updateFaqInput: UpdateFaqInput): Promise<Faq> {
    await this.faqRepository.update(id, updateFaqInput);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.faqRepository.delete(id);
  }

  async bulkUpdateOrder(bulkInput: BulkUpdateFaqOrderInput): Promise<Faq[]> {
    const updatePromises = bulkInput.items.map((item) =>
      this.faqRepository.update(item.id, { order: item.order }),
    );
    await Promise.all(updatePromises);

    // Return updated FAQs in order
    return this.faqRepository.find({
      where: { id: In(bulkInput.items.map((item) => item.id)) },
      order: { order: 'ASC' },
    });
  }
}
