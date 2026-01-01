import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../user/entities/user.entity';
import { Advertisement } from '../../advertisement/entities/advertisement.entity';
import { ComplaintStatus } from '../enums/complaint-status.enum';
import { ComplaintReason } from '../enums/complaint-reason.enum';

@ObjectType()
@Entity('complaints')
export class Complaint {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column({ type: 'uuid' })
  advertisementId: string;

  @Field(() => Advertisement)
  @ManyToOne(() => Advertisement)
  @JoinColumn({ name: 'advertisementId' })
  advertisement: Advertisement;

  @Field(() => ComplaintReason)
  @Column({
    type: 'enum',
    enum: ComplaintReason,
  })
  reason: ComplaintReason;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field(() => ComplaintStatus)
  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.PENDING,
  })
  status: ComplaintStatus;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  adminResponse?: string;

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: User;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
