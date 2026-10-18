import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  BroadcastAudience,
  BroadcastRecipientType,
} from '../enums/broadcast.enum';

@ObjectType()
export class BroadcastRecipient {
  @Field()
  id: string;

  @Field(() => BroadcastRecipientType)
  type: BroadcastRecipientType;

  @Field({ nullable: true })
  name?: string;
}

/** An admin-sent notification (BRD 4.3.24); one row per send. */
@ObjectType()
@Entity('notification_broadcasts')
export class NotificationBroadcast {
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
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Field()
  @Column({ type: 'text' })
  message: string;

  @Field(() => [BroadcastRecipientType])
  @Column({ type: 'enum', enum: BroadcastRecipientType, array: true })
  recipientTypes: BroadcastRecipientType[];

  @Field(() => BroadcastAudience)
  @Column({ type: 'enum', enum: BroadcastAudience })
  audience: BroadcastAudience;

  @Field(() => [BroadcastRecipient], {
    nullable: true,
    description: 'Hand-picked recipients (SELECTED audience only)',
  })
  @Column({ type: 'jsonb', nullable: true })
  recipients: BroadcastRecipient[] | null;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  recipientCount: number;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  createdByAdminId: string | null;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
