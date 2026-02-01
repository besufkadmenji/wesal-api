import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BankStatus } from '../enums/bank-status.enum';

@ObjectType()
@Entity('banks')
export class Bank {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  nameEn: string;

  @Field()
  @Column({ type: 'text' })
  nameAr: string;

  @Field(() => BankStatus)
  @Column({
    type: 'enum',
    enum: BankStatus,
    default: BankStatus.ACTIVE,
  })
  status: BankStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  deactivationReason?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
