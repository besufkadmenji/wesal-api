import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';
import { Contract } from '../../contract/entities/contract.entity';
import { Conversation } from '../../conversation/entities/conversation.entity';
import { Listing } from '../../listing/entities/listing.entity';
import { ComplaintStatus } from '../enums/complaint-status.enum';
import { ComplaintReporterType } from '../enums/complaint-reporter-type.enum';
import { ComplaintMessage } from './complaint-message.entity';

export interface ComplaintAttachment {
  filename: string;
  path: string;
  url: string;
  mimeType: 'image/jpeg' | 'image/png';
  size: number;
}

@ObjectType()
@Entity('complaints')
@Unique(['reporterId', 'reporterType', 'conversationId'])
export class Complaint {
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

  @Field(() => ID)
  @Column({ type: 'uuid' })
  reporterId: string;

  @Field(() => ComplaintReporterType)
  @Column({ type: 'enum', enum: ComplaintReporterType })
  reporterType: ComplaintReporterType;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  listingId: string;

  @Field(() => Listing)
  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  conversationId: string;

  @Field(() => Conversation)
  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  contractId: string | null;

  @Field(() => Contract, { nullable: true })
  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contractId' })
  contract: Contract | null;

  @Field()
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field(() => GraphQLJSON)
  @Column({ type: 'jsonb', default: [] })
  attachments: ComplaintAttachment[];

  @Field(() => ComplaintStatus)
  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.PENDING,
  })
  status: ComplaintStatus;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  reviewedByAdminId: string | null;

  @Field(() => Admin, { nullable: true })
  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'reviewedByAdminId' })
  reviewer: Admin | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Field(() => [ComplaintMessage])
  @OneToMany(() => ComplaintMessage, (message) => message.complaint)
  messages: ComplaintMessage[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
