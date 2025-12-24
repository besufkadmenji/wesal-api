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
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Advertisement } from '../../advertisement/entities/advertisement.entity';
import { User } from '../../user/entities/user.entity';
import { Message } from './message.entity';

@ObjectType()
@Entity('conversations')
export class Conversation {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  advertisementId: string;

  @Field(() => Advertisement)
  @ManyToOne(() => Advertisement)
  @JoinColumn({ name: 'advertisementId' })
  advertisement: Advertisement;

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

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Field()
  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

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
