import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserStatus } from './enums/user-status.enum';
import { UserRole } from './enums/user-role.enum';
import { Category } from '../category/entities/category.entity';
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
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
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
      if (existingUser.phoneVerified && existingUser.emailVerified) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_ALREADY_EXISTS],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
      return existingUser;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserInput.password, 10);

    // Handle categories for providers
    let categories: Category[] | undefined;
    if (createUserInput.categoryIds && createUserInput.categoryIds.length > 0) {
      categories = await this.categoryRepository.find({
        where: { id: In(createUserInput.categoryIds) },
      });
    }

    const user = this.userRepository.create({
      ...createUserInput,
      password: hashedPassword,
      categories,
      status:
        createUserInput.role === UserRole.PROVIDER
          ? UserStatus.PENDING_APPROVAL
          : UserStatus.ACTIVE,
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
      role,
    } = paginationInput;

    const skip = (page - 1) * limit;
    const order: {
      [key: string]: 'ASC' | 'DESC';
    } = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'DESC' };

    const [items, total] = await this.userRepository.findAndCount({
      where: {
        role,
        status:
          paginationInput.status ??
          In([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED]),
      },
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
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['categories'],
    });
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
        USER_ERROR_MESSAGES['EMAIL_PHONE_IMMUTABLE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate that existing data cannot be unset
    if (updateUserInput.name === null || updateUserInput.name === '') {
      if (user.name) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES['NAME_CANNOT_BE_REMOVED'],
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
          USER_ERROR_MESSAGES['BANK_NAME_CANNOT_BE_REMOVED'],
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
          USER_ERROR_MESSAGES['IBAN_CANNOT_BE_REMOVED'],
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
          USER_ERROR_MESSAGES['ADDRESS_CANNOT_BE_REMOVED'],
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
          USER_ERROR_MESSAGES['LATITUDE_CANNOT_BE_REMOVED'],
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
          USER_ERROR_MESSAGES['LONGITUDE_CANNOT_BE_REMOVED'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    // Validate categories - cannot be emptied if they already exist
    if (
      updateUserInput.categoryIds !== undefined &&
      updateUserInput.categoryIds !== null
    ) {
      if (
        user.categories &&
        user.categories.length > 0 &&
        updateUserInput.categoryIds.length === 0
      ) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES['CATEGORIES_CANNOT_BE_REMOVED'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Update categories if provided
      if (updateUserInput.categoryIds.length > 0) {
        const categories = await this.categoryRepository.find({
          where: { id: In(updateUserInput.categoryIds) },
        });
        user.categories = categories;
      }
    }

    // Remove categoryIds from the update payload before assigning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { categoryIds, ...updateData } = updateUserInput;
    Object.assign(user, updateData);
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

  async remove(id: string, language: LanguageCode = 'en'): Promise<User> {
    const user = await this.findOne(id, language);
    return this.userRepository.remove(user);
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
    return this.userRepository.save(user);
  }

  async deactivate(id: string, language: LanguageCode = 'en'): Promise<User> {
    const user = await this.findOne(id, language);

    // Check if already inactive
    if (user.status === UserStatus.INACTIVE) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_ALREADY_INACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Prevent deactivation of last active provider
    if (user.role === UserRole.PROVIDER) {
      const activeProviderCount = await this.userRepository.count({
        where: { role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });

      if (activeProviderCount === 1) {
        const message = I18nService.translate(
          USER_ERROR_MESSAGES[
            USER_ERROR_CODES.CANNOT_DEACTIVATE_LAST_ACTIVE_PROVIDER
          ],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    user.status = UserStatus.INACTIVE;
    return this.userRepository.save(user);
  }
}
