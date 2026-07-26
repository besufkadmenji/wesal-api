import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { ContractSettlementType } from '../enums/contract-settlement-type.enum';

@ObjectType()
@Entity('contract_settlements')
@Index(['idempotencyKey'], { unique: true })
export class ContractSettlement {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column('uuid')
  contractId: string;

  @ManyToOne(() => Contract, (contract) => contract.settlements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Field(() => ID)
  @Column('uuid')
  paymentId: string;

  @Field(() => ContractSettlementType)
  @Column({ type: 'enum', enum: ContractSettlementType })
  type: ContractSettlementType;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Field()
  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
