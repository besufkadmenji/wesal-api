import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { BankPaginationInput } from './dto/bank-pagination.input';
import { CreateBankInput } from './dto/create-bank.input';
import { UpdateBankInput } from './dto/update-bank.input';
import { Bank } from './entities/bank.entity';
import { BankStatus } from './enums/bank-status.enum';
import { BANK_ERROR_MESSAGES } from './errors/bank.error-messages';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(Bank)
    private readonly bankRepository: Repository<Bank>,
  ) {}

  async create(
    createBankInput: CreateBankInput,
    language: LanguageCode = 'en',
  ): Promise<Bank> {
    // Check if bank with the same name already exists
    const existingBank = await this.bankRepository.findOne({
      where: [
        { nameEn: createBankInput.nameEn },
        { nameAr: createBankInput.nameAr },
      ],
    });

    if (existingBank) {
      const message = I18nService.translate(
        BANK_ERROR_MESSAGES['BANK_NAME_ALREADY_EXISTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const bank = this.bankRepository.create(createBankInput);
    return await this.bankRepository.save(bank);
  }

  async findAll(
    paginationInput?: BankPaginationInput,
  ): Promise<IPaginatedType<Bank>> {
    const { page = 1, limit = 10, search, status } = paginationInput || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.bankRepository.createQueryBuilder('bank');

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(bank.nameEn ILIKE :search OR bank.nameAr ILIKE :search)',
        { search: searchTerm },
      );
    }

    // Add status filter if provided
    if (status) {
      queryBuilder.andWhere('bank.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('bank.createdAt', 'DESC')
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Bank> {
    const bank = await this.bankRepository.findOne({
      where: { id },
    });

    if (!bank) {
      const message = I18nService.translate(
        BANK_ERROR_MESSAGES['BANK_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return bank;
  }

  async update(
    updateBankInput: UpdateBankInput,
    language: LanguageCode = 'en',
  ): Promise<Bank> {
    const bank = await this.findOne(updateBankInput.id, language);

    // Check if new name is already in use by another bank
    if (updateBankInput.nameEn || updateBankInput.nameAr) {
      const existingBank = await this.bankRepository
        .createQueryBuilder('bank')
        .where('bank.id != :id', { id: updateBankInput.id })
        .andWhere('(bank.nameEn = :nameEn OR bank.nameAr = :nameAr)', {
          nameEn: updateBankInput.nameEn || bank.nameEn,
          nameAr: updateBankInput.nameAr || bank.nameAr,
        })
        .getOne();

      if (existingBank) {
        const message = I18nService.translate(
          BANK_ERROR_MESSAGES['BANK_NAME_ALREADY_EXISTS'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    Object.assign(bank, updateBankInput);
    return await this.bankRepository.save(bank);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Bank> {
    const bank = await this.findOne(id, language);
    await this.bankRepository.remove(bank);
    return bank;
  }

  async activate(id: string, language: LanguageCode = 'en'): Promise<Bank> {
    const bank = await this.findOne(id, language);

    // Check if already active
    if (bank.status === BankStatus.ACTIVE) {
      const message = I18nService.translate(
        BANK_ERROR_MESSAGES['BANK_ALREADY_ACTIVE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    bank.status = BankStatus.ACTIVE;
    return await this.bankRepository.save(bank);
  }

  async deactivate(
    id: string,
    reason: string,
    language: LanguageCode = 'en',
  ): Promise<Bank> {
    const bank = await this.findOne(id, language);

    // Check if already inactive
    if (bank.status === BankStatus.INACTIVE) {
      const message = I18nService.translate(
        BANK_ERROR_MESSAGES['BANK_ALREADY_INACTIVE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    bank.status = BankStatus.INACTIVE;
    bank.deactivationReason = reason;
    return await this.bankRepository.save(bank);
  }
}
