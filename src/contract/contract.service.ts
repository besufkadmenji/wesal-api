import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateContractInput } from './dto/create-contract.input';
import { UpdateContractInput } from './dto/update-contract.input';
import { ContractPaginationInput } from './dto/contract-pagination.input';
import { Contract } from './entities/contract.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { User } from '../user/entities/user.entity';
import { CONTRACT_ERROR_MESSAGES } from './errors/contract.error-messages';

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createContractInput: CreateContractInput,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    // Validate conversation exists
    const conversation = await this.conversationRepository.findOne({
      where: { id: createContractInput.conversationId },
    });
    if (!conversation) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['CONVERSATION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate client exists
    const client = await this.userRepository.findOne({
      where: { id: createContractInput.clientId },
    });
    if (!client) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['CLIENT_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate provider exists
    const provider = await this.userRepository.findOne({
      where: { id: createContractInput.providerId },
    });
    if (!provider) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['PROVIDER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate agreed price
    if (createContractInput.agreedPrice <= 0) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['INVALID_PRICE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate down payment
    if (createContractInput.downPayment > createContractInput.agreedPrice) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['INVALID_DOWN_PAYMENT'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check for duplicate contract
    const existingContract = await this.contractRepository.findOne({
      where: {
        conversationId: createContractInput.conversationId,
      },
    });

    if (existingContract) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['DUPLICATE_CONTRACT'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const contract = this.contractRepository.create(createContractInput);
    return await this.contractRepository.save(contract);
  }

  async findAll(
    paginationInput: ContractPaginationInput,
  ): Promise<IPaginatedType<Contract>> {
    const {
      page = 1,
      limit = 10,
      conversationId,
      clientId,
      providerId,
      status,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.conversation', 'conversation')
      .leftJoinAndSelect('contract.client', 'client')
      .leftJoinAndSelect('contract.provider', 'provider')
      .leftJoinAndSelect('contract.signatures', 'signatures');

    if (conversationId) {
      queryBuilder.andWhere('contract.conversationId = :conversationId', {
        conversationId,
      });
    }

    if (clientId) {
      queryBuilder.andWhere('contract.clientId = :clientId', { clientId });
    }

    if (providerId) {
      queryBuilder.andWhere('contract.providerId = :providerId', {
        providerId,
      });
    }

    if (status) {
      queryBuilder.andWhere('contract.status = :status', { status });
    }

    const orderByField = sortBy ? `contract.${sortBy}` : 'contract.createdAt';
    const orderDirection = sortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(orderByField, orderDirection)
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['conversation', 'client', 'provider', 'signatures'],
    });

    if (!contract) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['CONTRACT_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return contract;
  }

  async update(
    updateContractInput: UpdateContractInput,
    language: LanguageCode = 'en',
  ): Promise<Contract> {
    const contract = await this.findOne(updateContractInput.id, language);

    // Validate agreed price if being updated
    if (
      updateContractInput.agreedPrice !== undefined &&
      updateContractInput.agreedPrice <= 0
    ) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['INVALID_PRICE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate down payment if being updated
    const agreedPrice = updateContractInput.agreedPrice ?? contract.agreedPrice;
    const downPayment = updateContractInput.downPayment ?? contract.downPayment;

    if (downPayment > agreedPrice) {
      const message = I18nService.translate(
        CONTRACT_ERROR_MESSAGES['INVALID_DOWN_PAYMENT'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    Object.assign(contract, updateContractInput);
    return await this.contractRepository.save(contract);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Contract> {
    const contract = await this.findOne(id, language);
    await this.contractRepository.remove(contract);
    return contract;
  }
}
