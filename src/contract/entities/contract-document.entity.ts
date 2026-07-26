import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contract } from './contract.entity';

@ObjectType()
@Entity('contract_documents')
export class ContractDocument {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column({ type: 'uuid', unique: true })
  contractId: string;

  @OneToOne(() => Contract, (contract) => contract.document, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Field()
  @Column({ type: 'int' })
  version: number;

  @Field()
  @Column({ type: 'text' })
  path: string;

  @Field()
  @Column({ type: 'varchar', length: 64 })
  sha256: string;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
