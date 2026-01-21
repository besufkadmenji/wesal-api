import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Advertisement } from './advertisement.entity';

@ObjectType()
@Entity('advertisement_media')
export class AdvertisementMedia {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'bigint', unique: true, nullable: true })
  publicId: number | null;

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
