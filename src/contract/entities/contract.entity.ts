import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Conversation } from '../../conversation/entities/conversation.entity';
import { User } from '../../user/entities/user.entity';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractSignature } from './contract-signature.entity';

@ObjectType()
@Entity('contracts')
export class Contract {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  conversationId: string;

  @Field(() => Conversation)
  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

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

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  agreedPrice: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  downPayment: number;

  @Field(() => ContractStatus)
  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.PENDING,
  })
  status: ContractStatus;

  @Field(() => [ContractSignature], { nullable: true })
  @OneToMany(() => ContractSignature, (signature) => signature.contract, {
    cascade: true,
  })
  signatures: ContractSignature[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
