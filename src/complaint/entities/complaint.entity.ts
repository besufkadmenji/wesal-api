import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from '../../user/entities/user.entity';
import { Listing } from '../../listing/entities/listing.entity';
import { ComplaintStatus } from '../enums/complaint-status.enum';
import { ComplaintReason } from '../enums/complaint-reason.enum';

@ObjectType()
@Entity('complaints')
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

  @Field()
  @Column({ type: 'uuid' })
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column({ type: 'uuid' })
  listingId: string;

  @Field(() => Listing)
  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

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
