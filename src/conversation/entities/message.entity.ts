import { Field, ID, ObjectType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { ConversationSenderType } from '../enums/sender-type.enum';
import { MessageKind } from '../enums/message-kind.enum';

@ObjectType()
@Entity('messages')
export class Message {
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
  conversationId: string;

  @Field(() => Conversation)
  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  // Sender is polymorphic: either the customer (User) or the Provider. The id
  // has no DB-level FK because it can reference either table; `senderType`
  // discriminates. The resolved `sender` object is exposed via a @ResolveField.
  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  senderId: string | null;

  // Defaults to USER so `synchronize` can backfill legacy rows (all of which
  // were User-sent under the previous single-relation model) safely.
  @Field(() => ConversationSenderType)
  @Column({
    type: 'enum',
    enum: ConversationSenderType,
    default: ConversationSenderType.USER,
  })
  senderType: ConversationSenderType;

  @Field(() => MessageKind)
  @Column({ type: 'enum', enum: MessageKind, default: MessageKind.TEXT })
  kind: MessageKind;

  @Field()
  @Column({ type: 'text', default: '' })
  content: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
