import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Contract } from './contract.entity';
import { User } from '../../user/entities/user.entity';

@ObjectType()
@Entity('contract_signatures')
export class ContractSignature {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  contractId: string;

  @Field(() => Contract)
  @ManyToOne(() => Contract, (contract) => contract.signatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Field()
  @Column({ type: 'uuid' })
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column({ type: 'text' })
  signatureData: string;

  @Field()
  @CreateDateColumn()
  signedAt: Date;
}
