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
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Listing } from '../../listing/entities/listing.entity';
import { User } from '../../user/entities/user.entity';
import { Provider } from '../../provider/entities/provider.entity';
import { Message } from './message.entity';
import { ConversationStatus } from '../enums/conversation-status.enum';

@ObjectType()
@Entity('conversations')
export class Conversation {
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
  listingId: string;

  @Field(() => Listing)
  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @Field()
  @Column({ type: 'uuid' })
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column({ type: 'uuid' })
  providerId: string;

  @Field(() => Provider)
  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Field(() => ConversationStatus)
  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  customerFeePaidAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  providerFeePaidAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  customerLastReadAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  providerLastReadAt: Date | null;

  @Field(() => [Message], { nullable: true })
  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
