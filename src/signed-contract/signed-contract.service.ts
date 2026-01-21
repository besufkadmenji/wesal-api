import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignedContract } from './signed-contract.entity';
import { SignedContractPaginationInput } from './dto/signed-contract-pagination.input';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { IPaginatedType } from '../../lib/common/dto/paginated-response';

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
      userId,
      search,
      sortBy,
      sortOrder = SortOrder.DESC,
    } = paginationInput ?? {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.signedContractRepository
      .createQueryBuilder('signedContract')
      .leftJoinAndSelect('signedContract.user', 'user')
      .where('1 = 1');

    if (userId) {
      queryBuilder.andWhere('signedContract.userId = :userId', { userId });
    }

    // Add search filter if provided
    // Search by: Service Provider Name, Trade Name, Service Provider Mobile Number, Contract Number
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.commercialName ILIKE :search OR user.phone ILIKE :search OR "signedContract"."publicId"::text ILIKE :search)',
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

  async findByUserId(userId: string): Promise<SignedContract | null> {
    return this.signedContractRepository.findOne({
      where: { userId },
      relations: ['user'],
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

  async delete(id: string): Promise<SignedContract | null> {
    const contract = await this.signedContractRepository.findOneBy({ id });
    if (contract) {
      await this.signedContractRepository.remove(contract);
    }
    return contract;
  }

  async findByUserIdOrCreate(userId: string): Promise<SignedContract | null> {
    return this.signedContractRepository.findOne({
      where: { userId },
    });
  }
}
