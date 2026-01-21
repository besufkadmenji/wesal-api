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
@Entity('advertisement_attributes')
export class AdvertisementAttributes {
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
