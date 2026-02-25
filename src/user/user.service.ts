import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { PUB_SUB } from 'lib/pubsub/pubsub.module';
import { PubSub } from 'graphql-subscriptions';
import { Admin } from 'src/admin/entities/admin.entity';
import { Repository } from 'typeorm';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserPaginationInput } from './dto/user-pagination.input';
import { User } from './entities/user.entity';
import { UserStatus } from './enums/user-status.enum';
import { USER_ERROR_CODES } from './errors/user.error-codes';
import { USER_ERROR_MESSAGES } from './errors/user.error-messages';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
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
      if (existingUser.email === createUserInput.email) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.EMAIL_ALREADY_IN_USE],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.PHONE_ALREADY_IN_USE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserInput.password, 10);

    const user = this.userRepository.create({
      ...createUserInput,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
    });

    return this.userRepository.save(user);
  }

  async findAll(
    paginationInput: UserPaginationInput,
  ): Promise<IPaginatedType<User>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'ASC',
      search,
    } = paginationInput;

    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.status IN (:...statuses)', {
        statuses: paginationInput.status
          ? [paginationInput.status]
          : [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED],
      });

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search OR user.publicId::text ILIKE :search)',
        { search: searchTerm },
      );
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(`user.${sortBy || 'createdAt'}`, sortOrder)
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.country', 'country')
      .leftJoinAndSelect('user.city', 'city')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

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

    // Phone and email cannot be changed
    if (updateUserInput.email || updateUserInput.phone) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.EMAIL_PHONE_IMMUTABLE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate that existing data cannot be unset
    if (updateUserInput.name === null || updateUserInput.name === '') {
      if (user.name) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.NAME_CANNOT_BE_REMOVED],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    if (updateUserInput.bankName === null || updateUserInput.bankName === '') {
      if (user.bankName) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.BANK_NAME_CANNOT_BE_REMOVED],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    if (
      updateUserInput.ibanNumber === null ||
      updateUserInput.ibanNumber === ''
    ) {
      if (user.ibanNumber) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.IBAN_CANNOT_BE_REMOVED],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    if (updateUserInput.address === null || updateUserInput.address === '') {
      if (user.address) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.ADDRESS_CANNOT_BE_REMOVED],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    if (updateUserInput.latitude === null) {
      if (user.latitude !== null && user.latitude !== undefined) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.LATITUDE_CANNOT_BE_REMOVED],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    if (updateUserInput.longitude === null) {
      if (user.longitude !== null && user.longitude !== undefined) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.LONGITUDE_CANNOT_BE_REMOVED],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    Object.assign(user, updateUserInput);
    return this.userRepository.save(user);
  }

  async removeAvatar(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    await this.findOne(id, language);
    await this.userRepository.update(id, { avatarFilename: null });
    return true;
  }

  async remove(
    id: string,
    reason?: string,
    language: LanguageCode = 'en',
  ): Promise<User> {
    const user = await this.findOne(id, language);
    user.deletedAt = new Date();
    if (reason) {
      user.deleteReason = reason;
      user.status = UserStatus.DELETED;
    }
    return this.userRepository.save(user);
  }

  async activate(id: string, language: LanguageCode = 'en'): Promise<User> {
    const user = await this.findOne(id, language);

    // Check if already active
    if (user.status === UserStatus.ACTIVE) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_ALREADY_ACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    user.status = UserStatus.ACTIVE;
    const saved = await this.userRepository.save(user);
    await this.pubSub.publish('userUpdated', { userUpdated: saved });
    return saved;
  }

  async deactivate(
    id: string,
    reason?: string,
    language: LanguageCode = 'en',
  ): Promise<User> {
    const user = await this.findOne(id, language);

    // Check if already inactive
    if (user.status === UserStatus.INACTIVE) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_ALREADY_INACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    user.status = UserStatus.INACTIVE;
    if (reason) {
      user.deactivationReason = reason;
    }
    const saved = await this.userRepository.save(user);
    await this.pubSub.publish('userUpdated', { userUpdated: saved });
    return saved;
  }
}
