import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ActionType } from '../enums/action-type.enum';
import { TargetType } from '../enums/target-type.enum';

@ObjectType()
@Entity('tracking')
@Index(['userId', 'targetType', 'targetId', 'actionType'], { unique: true })
@Index(['targetType', 'targetId', 'actionType'])
@Index(['userId', 'targetType', 'actionType'])
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

  @Field(() => Int)
  @Column({ type: 'int', default: 1 })
  count: number;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;
}
