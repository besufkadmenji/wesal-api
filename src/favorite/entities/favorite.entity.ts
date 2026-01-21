import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from '../../user/entities/user.entity';
import { Advertisement } from '../../advertisement/entities/advertisement.entity';

@ObjectType()
@Entity('favorites')
@Unique(['userId', 'advertisementId'])
export class Favorite {
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
