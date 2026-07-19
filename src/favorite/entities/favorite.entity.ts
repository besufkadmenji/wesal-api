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
import { Provider } from '../../provider/entities/provider.entity';

@ObjectType()
@Entity('favorites')
@Unique(['userId', 'providerId'])
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
  providerId: string;

  @Field(() => Provider)
  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
