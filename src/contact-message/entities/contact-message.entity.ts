import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('contact_messages')
export class ContactMessage {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  attachmentFilename?: string;

  @Field()
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
