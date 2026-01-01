import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from 'src/user/entities/user.entity';
import { Advertisement } from 'src/advertisement/entities/advertisement.entity';

@ObjectType()
@Entity('ratings')
@Unique(['userId', 'advertisementId'])
export class Rating {
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

  @Field(() => Int)
  @Column({ type: 'int' })
  rating: number;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
