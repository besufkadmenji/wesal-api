import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ActionType } from '../enums/action-type.enum';
import { TargetType } from '../enums/target-type.enum';

@ObjectType()
@Entity('tracking')
@Index(['userId', 'targetType', 'targetId', 'actionType'])
@Index(['targetType', 'targetId', 'actionType'])
@Index(['createdAt'])
export class Tracking {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String)
  @Column('uuid')
  @Index()
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Field(() => TargetType)
  @Column({
    type: 'enum',
    enum: TargetType,
  })
  @Index()
  targetType: TargetType;

  @Field(() => String)
  @Column('uuid')
  @Index()
  targetId: string;

  @Field(() => ActionType)
  @Column({
    type: 'enum',
    enum: ActionType,
  })
  actionType: ActionType;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;
}
