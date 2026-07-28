import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { SignedContractPaginationInput } from './dto/signed-contract-pagination.input';
import { SignedContract } from './signed-contract.entity';
import { SignedContractStatus } from 'src/provider/enums/contract.enum';
import { I18nNotFoundException } from '../../lib/errors';
import type { LanguageCode } from '../../lib/i18n/language.types';

@Injectable()
export class SignedContractService {
  constructor(
    @InjectRepository(SignedContract)
    private readonly signedContractRepository: Repository<SignedContract>,
  ) {}

  async findAll(
    paginationInput?: SignedContractPaginationInput,
  ): Promise<IPaginatedType<SignedContract>> {
    const {
      page = 1,
      limit = 10,
      providerId,
      search,
      sortBy,
      sortOrder = SortOrder.DESC,
    } = paginationInput ?? {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.signedContractRepository
      .createQueryBuilder('signedContract')
      .leftJoinAndSelect('signedContract.provider', 'provider')
      .where('signedContract.status != :terminatedStatus', {
        terminatedStatus: SignedContractStatus.TERMINATED_BY_PROVIDER,
      });

    if (providerId) {
      queryBuilder.andWhere('signedContract.providerId = :providerId', {
        providerId,
      });
    }

    // Add search filter if provided
    // Search by: Service Provider Name, Trade Name, Service Provider Mobile Number, Email, Contract Number
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(provider.name ILIKE :search OR provider.commercialName ILIKE :search OR provider.phone ILIKE :search OR provider.email ILIKE :search OR "signedContract"."publicId"::text ILIKE :search)',
        { search: searchTerm },
      );
    }

    const orderByField = sortBy
      ? `signedContract.${sortBy}`
      : 'signedContract.createdAt';
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

  async findByProviderId(providerId: string): Promise<SignedContract | null> {
    return this.signedContractRepository.findOne({
      where: { providerId },
      relations: [
        'provider',
        'provider.categories',
        'provider.city',
        'provider.country',
      ],
    });
  }

  async findById(id: string): Promise<SignedContract | null> {
    return this.signedContractRepository.findOne({
      where: { id, status: Not(SignedContractStatus.TERMINATED_BY_PROVIDER) },
      relations: [
        'provider',
        'provider.categories',
        'provider.city',
        'provider.country',
      ],
    });
  }

  async create(
    signedContract: Partial<SignedContract>,
  ): Promise<SignedContract> {
    const contract = this.signedContractRepository.create(signedContract);
    return this.signedContractRepository.save(contract);
  }

  async update(
    id: string,
    updates: Partial<SignedContract>,
  ): Promise<SignedContract | null> {
    await this.signedContractRepository.update(id, updates);
    return this.signedContractRepository.findOneBy({ id });
  }

  async delete(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<SignedContract> {
    const contract = await this.signedContractRepository.findOneBy({ id });
    if (!contract) {
      throw new I18nNotFoundException(
        {
          en: 'Signed contract not found',
          ar: 'العقد الإلكتروني غير موجود',
        },
        language,
      );
    }
    await this.signedContractRepository.remove(contract);
    return contract;
  }

  async deleteByProviderId(providerId: string): Promise<void> {
    const contract = await this.signedContractRepository.findOneBy({
      providerId,
    });
    if (contract) {
      await this.signedContractRepository.remove(contract);
    }
  }

  async findByProviderIdOrCreate(
    providerId: string,
  ): Promise<SignedContract | null> {
    return this.signedContractRepository.findOne({
      where: { providerId },
    });
  }
}
