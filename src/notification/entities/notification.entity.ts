import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from 'src/user/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';

@ObjectType()
@Entity('notifications')
export class Notification {
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

  @Field(() => NotificationType)
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Field()
  @Column({ type: 'text' })
  message: string;

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  relatedEntityId?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  relatedEntityType?: string;

  @Field()
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
