import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import type { LanguageCode } from '../../lib/i18n/language.types';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import { USER_ERROR_CODES } from './errors/user.error-codes';
import { USER_ERROR_MESSAGES } from './errors/user.error-messages';
import { UserPaginationInput } from './dto/user-pagination.input';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createUserInput: CreateUserInput,
    language: LanguageCode = 'en',
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: createUserInput.email },
        { phone: createUserInput.phone },
      ],
    });

    if (existingUser) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_ALREADY_EXISTS],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserInput.password, 10);

    const user = this.userRepository.create({
      ...createUserInput,
      passwordHash,
    });

    return this.userRepository.save(user);
  }

  async findAll(
    paginationInput?: UserPaginationInput,
  ): Promise<IPaginatedType<User>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'ASC',
    } = paginationInput || {};

    const skip = (page - 1) * limit;
    const order: {
      [key: string]: 'ASC' | 'DESC';
    } = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'DESC' };

    const [items, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      order,
    });

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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }
    return user;
  }

  async update(
    id: string,
    updateUserInput: UpdateUserInput,
    language: LanguageCode = 'en',
  ): Promise<User> {
    const user = await this.findOne(id, language);

    // Check if new email/phone is already taken
    if (updateUserInput.email || updateUserInput.phone) {
      const conflictUser = await this.userRepository.findOne({
        where: [
          {
            email: updateUserInput.email || user.email,
            id: `NOT(${id})`,
          },
          {
            phone: updateUserInput.phone || user.phone,
            id: `NOT(${id})`,
          },
        ],
      });

      if (conflictUser) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.EMAIL_ALREADY_IN_USE],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    // Hash new password if provided
    if (updateUserInput.password) {
      updateUserInput['passwordHash'] = await bcrypt.hash(
        updateUserInput.password,
        10,
      );
      delete updateUserInput['password'];
    }

    Object.assign(user, updateUserInput);
    return this.userRepository.save(user);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<User> {
    const user = await this.findOne(id, language);
    return this.userRepository.remove(user);
  }
}
