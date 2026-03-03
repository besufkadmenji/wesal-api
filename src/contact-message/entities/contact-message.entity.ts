import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SenderType {
  GUEST = 'GUEST',
  USER = 'USER',
  PROVIDER = 'PROVIDER',
}

export enum ContactMessageStatus {
  SENT = 'SENT',
  READ = 'READ',
  REPLIED = 'REPLIED',
}

registerEnumType(SenderType, {
  name: 'SenderType',
  description: 'Type of contact message sender',
});

registerEnumType(ContactMessageStatus, {
  name: 'ContactMessageStatus',
  description: 'Status of a contact message',
});

@ObjectType()
@Entity('contact_messages')
export class ContactMessage {
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
  name: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 10, nullable: true })
  dialCode?: string;

  @Field()
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Field()
  @Column({ type: 'varchar', length: 100 })
  messageType: string;

  @Field()
  @Column({ type: 'text' })
  messageContent: string;

  @Field()
  @Column({ type: 'text', default: '' })
  reply: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  attachmentFilename?: string;

  @Field(() => SenderType)
  @Column({ type: 'enum', enum: SenderType, default: SenderType.GUEST })
  senderType: SenderType;

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  senderId?: string;

  @Field(() => ContactMessageStatus)
  @Column({
    type: 'enum',
    enum: ContactMessageStatus,
    default: ContactMessageStatus.SENT,
  })
  status: ContactMessageStatus;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
