import { Field, ID, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { ContractActorType } from '../enums/contract-actor-type.enum';
import { ContractAuditAction } from '../enums/contract-audit-action.enum';
import { ContractStatus } from '../enums/contract-status.enum';

@ObjectType()
@Entity('contract_audits')
export class ContractAudit {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column('uuid')
  contractId: string;

  @ManyToOne(() => Contract, (contract) => contract.audits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Field(() => ID)
  @Column('uuid')
  actorId: string;

  @Field(() => ContractActorType)
  @Column({ type: 'enum', enum: ContractActorType })
  actorType: ContractActorType;

  @Field(() => ContractAuditAction)
  @Column({ type: 'enum', enum: ContractAuditAction })
  action: ContractAuditAction;

  @Field(() => ContractStatus)
  @Column({ type: 'enum', enum: ContractStatus })
  previousStatus: ContractStatus;

  @Field(() => ContractStatus)
  @Column({ type: 'enum', enum: ContractStatus })
  newStatus: ContractStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
