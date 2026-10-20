import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Contract } from 'src/contract/entities/contract.entity';
import { Listing } from 'src/listing/entities/listing.entity';
import { Provider } from 'src/provider/entities/provider.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RatingStatus } from '../enums/rating-status.enum';

/**
 * A customer's evaluation of a completed contract (BRD 4.1.20.1).
 *
 * Legacy listing ratings created before Sprint 4 have no `contractId`.
 * Only PUBLISHED ratings count towards listing and provider averages.
 */
@ObjectType()
@Entity('ratings')
@Index('IDX_ratings_listing_status', ['listingId', 'status'])
@Index('IDX_ratings_provider_status', ['providerId', 'status'])
export class Rating {
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

  @Field()
  @Column({ type: 'uuid' })
  providerId: string;

  @Field(() => Provider)
  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Field(() => String, { nullable: true })
  @Column({ type: 'uuid', nullable: true, unique: true })
  contractId: string | null;

  @Field(() => Contract, { nullable: true })
  @OneToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contractId' })
  contract: Contract | null;

  @Field(() => Int, {
    description: 'Stars 1–5; 0 only for system-generated penalty ratings',
  })
  @Column({ type: 'int' })
  rating: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Field(() => RatingStatus)
  @Column({
    type: 'enum',
    enum: RatingStatus,
    default: RatingStatus.PUBLISHED,
  })
  status: RatingStatus;

  @Field({
    description:
      'True for ratings the platform records itself (e.g. 0★ on provider-overdue cancellation)',
  })
  @Column({ type: 'boolean', default: false })
  isSystemGenerated: boolean;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  moderatedAt: Date | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  moderatedByAdminId: string | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
