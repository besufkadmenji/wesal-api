import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { Contract } from '../../contract/entities/contract.entity';
import { Conversation } from '../../conversation/entities/conversation.entity';
import { Listing } from '../../listing/entities/listing.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentPurpose } from '../enums/payment-purpose.enum';
import { PayerType } from '../enums/payer-type.enum';

@ObjectType()
@Entity('payments')
export class Payment {
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

  @Field(() => PaymentPurpose)
  @Column({ type: 'enum', enum: PaymentPurpose })
  purpose: PaymentPurpose;

  @Field()
  @Column({ type: 'uuid' })
  payerId: string;

  @Field(() => PayerType)
  @Column({ type: 'enum', enum: PayerType })
  payerType: PayerType;

  @Column({ type: 'varchar', length: 255, unique: true })
  obligationKey: string;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  contractId: string | null;

  @Field(() => Contract, { nullable: true })
  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contractId' })
  contract: Contract | null;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  conversationId: string | null;

  @Field(() => Conversation, { nullable: true })
  @ManyToOne(() => Conversation, { nullable: true })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation | null;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  listingId: string | null;

  @Field(() => Listing, { nullable: true })
  @ManyToOne(() => Listing, { nullable: true })
  @JoinColumn({ name: 'listingId' })
  listing: Listing | null;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

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

  @Field(() => GraphQLJSON, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  configSnapshot: Record<string, unknown> | null;

  @Field(() => PaymentMethod)
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.MOCK })
  paymentMethod: PaymentMethod;

  @Field(() => PaymentStatus)
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionReference: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  gatewayResponse: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
