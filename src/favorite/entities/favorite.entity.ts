import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../user/entities/user.entity';
import { Advertisement } from '../../advertisement/entities/advertisement.entity';

@ObjectType()
@Entity('favorites')
@Unique(['userId', 'advertisementId'])
export class Favorite {
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

  @Field()
  @Column({ type: 'uuid' })
  advertisementId: string;

  @Field(() => Advertisement)
  @ManyToOne(() => Advertisement)
  @JoinColumn({ name: 'advertisementId' })
  advertisement: Advertisement;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
