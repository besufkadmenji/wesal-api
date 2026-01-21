import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignedContract } from './signed-contract.entity';

@Injectable()
export class SignedContractService {
  constructor(
    @InjectRepository(SignedContract)
    private readonly signedContractRepository: Repository<SignedContract>,
  ) {}

  async findAll(): Promise<SignedContract[]> {
    return this.signedContractRepository.find({
      relations: ['user'],
    });
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
