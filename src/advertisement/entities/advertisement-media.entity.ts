import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Advertisement } from './advertisement.entity';

@ObjectType()
@Entity('advertisement_media')
export class AdvertisementMedia {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  advertisementId: string;

  @Field(() => Advertisement)
  @ManyToOne(() => Advertisement, (advertisement) => advertisement.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'advertisementId' })
  advertisement: Advertisement;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Field(() => Int)
  @Column({ type: 'int' })
  sortOrder: number;
}
