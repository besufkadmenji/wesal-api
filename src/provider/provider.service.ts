import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from 'lib/pubsub/pubsub.module';
import { In, Repository } from 'typeorm';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { Admin } from '../admin/entities/admin.entity';
import { AdminPermissionType } from '../admin/enums/admin-permission-type.enum';
import { Category } from '../category/entities/category.entity';
import { Provider } from '../provider/entities/provider.entity';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { PROVIDER_ERROR_CODES } from '../provider/errors/provider.error-codes';
import { PROVIDER_ERROR_MESSAGES } from '../provider/errors/provider.error-messages';
import { SignedContractService } from '../signed-contract/signed-contract.service';
import { CreateProviderInput } from './dto/create-provider.input';
import { ProviderPaginationInput } from './dto/provider-pagination.input';
import {
  AdminSignContractInput,
  SignContractInput,
} from './dto/sign-contract.input';
import { AdminTerminateContractInput } from './dto/terminate-contract.input';
import { UpdateProviderInput } from './dto/update-provider.input';
import { SignedContractStatus } from './enums/contract.enum';

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly signedContractService: SignedContractService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async create(
    createProviderInput: CreateProviderInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    // Check if provider already exists
    const existingProvider = await this.providerRepository.findOne({
      where: [
        { email: createProviderInput.email },
        { phone: createProviderInput.phone },
      ],
    });

    if (existingProvider) {
      if (existingProvider.email === createProviderInput.email) {
        const message = I18nService.translate(
          PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.EMAIL_ALREADY_IN_USE],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PHONE_ALREADY_IN_USE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createProviderInput.password, 10);

    // Handle categories
    let categories: Category[] | undefined;
    if (
      createProviderInput.categoryIds &&
      createProviderInput.categoryIds.length > 0
    ) {
      categories = await this.categoryRepository.find({
        where: { id: In(createProviderInput.categoryIds) },
      });
    }

    const provider = this.providerRepository.create({
      ...createProviderInput,
      password: hashedPassword,
      categories,
      status: ProviderStatus.PENDING_APPROVAL,
    });

    return this.providerRepository.save(provider);
  }

  async findAll(
    paginationInput: ProviderPaginationInput,
  ): Promise<IPaginatedType<Provider>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'DESC',
      status,
      search,
    } = paginationInput;

    const query = this.providerRepository
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.country', 'country')
      .leftJoinAndSelect('provider.city', 'city')
      .leftJoinAndSelect('provider.categories', 'categories')
      .leftJoinAndSelect('provider.signedContract', 'signedContract')
      .where('provider.emailVerified = true')
      .andWhere('provider.phoneVerified = true');

    if (status) {
      query.andWhere('provider.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(provider.name ILIKE :search OR provider.email ILIKE :search OR provider.phone ILIKE :search OR provider."publicId"::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      query.orderBy(`provider.${sortBy}`, sortOrder);
    } else {
      query.orderBy('provider.createdAt', sortOrder);
    }

    const total = await query.getCount();
    const providers = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: providers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id },
      relations: ['country', 'city', 'categories', 'signedContract'],
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return provider;
  }

  async findByEmail(
    email: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { email },
      relations: ['country', 'city', 'categories', 'signedContract'],
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return provider;
  }

  async findByPhone(
    phone: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { phone },
      relations: ['country', 'city', 'categories', 'signedContract'],
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return provider;
  }

  async update(
    updateProviderInput: UpdateProviderInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id: updateProviderInput.id },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Handle categories if provided
    if (updateProviderInput.categoryIds) {
      const categories = await this.categoryRepository.find({
        where: { id: In(updateProviderInput.categoryIds) },
      });
      provider.categories = categories;
    }

    // Update other fields
    Object.assign(provider, updateProviderInput);

    return this.providerRepository.save(provider);
  }

  async activate(id: string, language: LanguageCode = 'en'): Promise<Provider> {
    const provider = await this.findOne(id, language);

    // Check if already active
    if (provider.status === ProviderStatus.ACTIVE) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_ALREADY_ACTIVE],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    provider.status = ProviderStatus.ACTIVE;
    const saved = await this.providerRepository.save(provider);
    await this.pubSub.publish('providerUpdated', { providerUpdated: saved });
    return saved;
  }

  async deactivate(
    id: string,
    reason?: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    provider.status = ProviderStatus.INACTIVE;
    if (reason) {
      provider.deactivationReason = reason;
    }
    const saved = await this.providerRepository.save(provider);
    await this.pubSub.publish('providerUpdated', { providerUpdated: saved });
    return saved;
  }

  async signContract(
    providerId: string,
    input: SignContractInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract is already signed
    if (provider.signedContract) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.CONTRACT_ALREADY_SIGNED],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Create signed contract
    const signedContract = await this.signedContractService.create({
      providerId: provider.id,
      provider: provider,
      serviceProviderSignature: input.serviceProviderSignature,
      platformManagerSignature: null,
      platformManagerName: null,
      contractSignedAt: new Date(),
      contractExpiresAt: null,
      status: SignedContractStatus.ACTIVE,
      terminationReason: null,
      acceptedRulesAr: input.acceptedRulesAr ?? null,
      acceptedRulesEn: input.acceptedRulesEn ?? null,
    });

    provider.signedContract = signedContract;
    return this.providerRepository.save(provider);
  }

  async adminSignContract(
    adminId: string,
    input: AdminSignContractInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId, permissionType: AdminPermissionType.SUPER_ADMIN },
    });

    if (!admin) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    const provider = await this.providerRepository.findOne({
      where: { id: input.providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract is signed
    if (!provider.signedContract) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.NO_SIGNED_CONTRACT],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    if (!admin.platformManagerSignature) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Update signed contract
    const updatedContract = await this.signedContractService.update(
      provider.signedContract.id,
      {
        platformManagerName: admin.fullName,
        platformManagerSignature: admin.platformManagerSignature,
      },
    );

    provider.signedContract = updatedContract;
    return this.providerRepository.save(provider);
  }

  async terminateContract(
    providerId: string,
    terminationReason: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract exists
    if (!provider.signedContract) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.NO_SIGNED_CONTRACT],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract is already terminated or expired
    if (
      provider.signedContract.status ===
        SignedContractStatus.TERMINATED_BY_PROVIDER ||
      provider.signedContract.status ===
        SignedContractStatus.TERMINATED_BY_ADMIN ||
      provider.signedContract.status === SignedContractStatus.EXPIRED
    ) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[
          PROVIDER_ERROR_CODES.CONTRACT_ALREADY_TERMINATED
        ],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Terminate contract
    const updatedContract = await this.signedContractService.update(
      provider.signedContract.id,
      {
        status: SignedContractStatus.TERMINATED_BY_PROVIDER,
        terminationReason,
      },
    );

    provider.signedContract = updatedContract;
    return this.providerRepository.save(provider);
  }

  async adminTerminateContract(
    adminId: string,
    input: AdminTerminateContractInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    if (admin.permissionType !== AdminPermissionType.SUPER_ADMIN) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const provider = await this.providerRepository.findOne({
      where: { id: input.providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract exists
    if (!provider.signedContract) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.NO_SIGNED_CONTRACT],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if contract is already terminated or expired
    if (
      provider.signedContract.status ===
        SignedContractStatus.TERMINATED_BY_PROVIDER ||
      provider.signedContract.status ===
        SignedContractStatus.TERMINATED_BY_ADMIN ||
      provider.signedContract.status === SignedContractStatus.EXPIRED
    ) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[
          PROVIDER_ERROR_CODES.CONTRACT_ALREADY_TERMINATED
        ],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Terminate contract
    const updatedContract = await this.signedContractService.update(
      provider.signedContract.id,
      {
        status: SignedContractStatus.TERMINATED_BY_ADMIN,
        terminationReason: input.terminationReason,
      },
    );

    provider.signedContract = updatedContract;
    return this.providerRepository.save(provider);
  }

  async remove(
    id: string,
    reason?: string,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id },
    });

    if (!provider) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    provider.deletedAt = new Date();
    if (reason) {
      provider.deleteReason = reason;
      provider.status = ProviderStatus.DELETED;
    }
    await this.providerRepository.save(provider);
    return provider;
  }

  async removeAvatar(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    await this.findOne(id, language);
    await this.providerRepository.update(id, { avatarFilename: null });
    return true;
  }
}
