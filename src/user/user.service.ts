import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { Category } from '../category/entities/category.entity';
import { CreateUserInput } from './dto/create-user.input';
import { SignContractInput } from './dto/sign-contract.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserPaginationInput } from './dto/user-pagination.input';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';
import { USER_ERROR_CODES } from './errors/user.error-codes';
import { USER_ERROR_MESSAGES } from './errors/user.error-messages';
import { SignedContractStatus } from './enums/contract.enum';

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
      search,
    } = paginationInput;

    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.role = :role', { role })
      .andWhere('user.status IN (:...statuses)', {
        statuses: paginationInput.status
          ? [paginationInput.status]
          : [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED],
      });

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
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
      .leftJoinAndSelect('user.categories', 'categories')
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

  async remove(
    id: string,
    reason?: string,
    language: LanguageCode = 'en',
  ): Promise<User> {
    const user = await this.findOne(id, language);
    user.deletedAt = new Date();
    if (reason) {
      user.deleteReason = reason;
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
    return this.userRepository.save(user);
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
    return this.userRepository.save(user);
  }

  async signContract(
    userId: string,
    input: SignContractInput,
    language: LanguageCode = 'en',
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if user is a provider
    if (user.role !== UserRole.PROVIDER) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.NOT_A_PROVIDER],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if contract is already signed
    if (user.signedContract) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.CONTRACT_ALREADY_SIGNED],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Create signed contract object
    user.signedContract = {
      serviceProviderName: input.serviceProviderName,
      commercialName: input.commercialName,
      phoneNumber: input.phoneNumber,
      dialCode: input.dialCode,
      categoryId: input.categoryId,
      categoryNameEn: input.categoryNameEn,
      categoryNameAr: input.categoryNameAr,
      address: input.address,
      serviceProviderSignature: input.serviceProviderSignature,
      platformManagerName: input.platformManagerName,
      platformManagerSignature: input.platformManagerSignature,
      verifiedWithAbsher: input.verifiedWithAbsher ?? false,
      contractSignedAt: new Date(),
      contractExpiresAt: null,
      status: SignedContractStatus.ACTIVE,
    };

    return this.userRepository.save(user);
  }

  async terminateContract(
    userId: string,
    language: LanguageCode = 'en',
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if user is a provider
    if (user.role !== UserRole.PROVIDER) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.NOT_A_PROVIDER],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if contract exists
    if (!user.signedContract) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES['CONTRACT_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract is already terminated or expired
    if (
      user.signedContract.status === SignedContractStatus.TERMINATED_BY_USER ||
      user.signedContract.status === SignedContractStatus.TERMINATED_BY_ADMIN ||
      user.signedContract.status === SignedContractStatus.EXPIRED
    ) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES['CONTRACT_ALREADY_TERMINATED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Terminate contract
    user.signedContract.status = SignedContractStatus.TERMINATED_BY_USER;

    return this.userRepository.save(user);
  }
}
