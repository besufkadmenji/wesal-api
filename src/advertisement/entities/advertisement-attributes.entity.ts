import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Advertisement } from './advertisement.entity';

@ObjectType()
@Entity('advertisement_attributes')
export class AdvertisementAttributes {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  advertisementId: string;

  @Field(() => Advertisement)
  @ManyToOne(() => Advertisement, (advertisement) => advertisement.attributes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'advertisementId' })
  advertisement: Advertisement;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  key: string;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  value: string;
}
