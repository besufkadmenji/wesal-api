import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Conversation } from '../../conversation/entities/conversation.entity';
import { User } from '../../user/entities/user.entity';
import { Provider } from '../../provider/entities/provider.entity';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractSignature } from './contract-signature.entity';
import { ContractSettlement } from './contract-settlement.entity';
import { ContractAudit } from './contract-audit.entity';
import { ContractDocument } from './contract-document.entity';

@ObjectType()
@Entity('contracts')
@Unique(['conversationId', 'version'])
export class Contract {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Int, { nullable: true })
  @Column({
    type: 'bigint',
    unique: true,
    nullable: true,
    default: () => "nextval('public_id_seq')",
  })
  publicId: number | null;

  @Field()
  @Column({ type: 'uuid' })
  conversationId: string;

  @Field(() => Conversation)
  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Field()
  @Column({ type: 'uuid' })
  listingId: string;

  @Field()
  @Column({ type: 'uuid' })
  categoryId: string;

  @Field()
  @Column({ type: 'uuid' })
  clientId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Field()
  @Column({ type: 'uuid' })
  providerId: string;

  @Field(() => Provider)
  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Field(() => Int)
  @Column({ type: 'int', default: 1 })
  version: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 2 })
  pricingVersion: number;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  supersedesContractId: string | null;

  @Field(() => Contract, { nullable: true })
  @ManyToOne(() => Contract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supersedesContractId' })
  supersedesContract: Contract | null;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  agreedPrice: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  depositPercent: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  downPayment: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionPercent: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commissionAmount: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatRate: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  vatAmount: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPayable: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  providerNetAmount: number;

  @Field()
  @Column({ type: 'text' })
  customerAddress: string;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  customerLatitude: number | null;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  customerLongitude: number | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  providerAddress: string | null;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  providerLatitude: number | null;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  providerLongitude: number | null;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  deliveryCompanyId: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  deliveryCompanyNameEn: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  deliveryCompanyNameAr: string | null;

  @Field()
  @Column({ type: 'text', default: '' })
  categoryRulesEn: string;

  @Field()
  @Column({ type: 'text', default: '' })
  categoryRulesAr: string;

  @Field()
  @Column({ type: 'text', default: '' })
  contractDocumentText: string;

  @Field()
  @Column({ type: 'text', default: '' })
  undertakingTextAr: string;

  @Field()
  @Column({ type: 'text', default: '' })
  undertakingTextEn: string;

  @Field()
  @Column({ type: 'text', default: '' })
  refundPolicyAr: string;

  @Field()
  @Column({ type: 'text', default: '' })
  refundPolicyEn: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  maxCompletionDays: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  maxTerminationDays: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  deliveryTimeDays: number | null;

  @Field(() => ContractStatus)
  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.PENDING,
  })
  status: ContractStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  disputeReason: string | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  providerCompletedAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  deliveryStartedAt: Date | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  deliveryEstimateDays: number | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  confirmationDeadlineAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  cancellationRequestedAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  disputedAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Field(() => [ContractSignature])
  @OneToMany(() => ContractSignature, (signature) => signature.contract, {
    cascade: true,
  })
  signatures: ContractSignature[];

  @Field(() => [ContractSettlement])
  @OneToMany(() => ContractSettlement, (settlement) => settlement.contract)
  settlements: ContractSettlement[];

  @Field(() => [ContractAudit])
  @OneToMany(() => ContractAudit, (audit) => audit.contract)
  audits: ContractAudit[];

  @Field(() => ContractDocument, { nullable: true })
  @OneToOne(() => ContractDocument, (document) => document.contract)
  document: ContractDocument | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
