import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { City } from '../../city/entities/city.entity';
import { Provider } from '../../provider/entities/provider.entity';
import {
  ListingStatus,
  ListingType,
  PromotionStatus,
} from '../enums/listing.enum';
import { ListingMedia } from './listing-media';

@ObjectType()
@Entity('listings')
export class Listing {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column('uuid')
  providerId: string;

  @Field(() => Provider, { nullable: true })
  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Field()
  @Column('uuid')
  categoryId: string;

  @Field(() => Category, { nullable: true })
  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Field()
  @Column('varchar')
  name: string;

  @Field()
  @Column('text')
  description: string;

  @Field()
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Field()
  @Column('uuid')
  cityId: string;

  @Field(() => City, { nullable: true })
  @ManyToOne(() => City, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cityId' })
  city: City;

  @Field(() => ListingStatus)
  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  @Field(() => ListingType)
  @Column({
    type: 'enum',
    enum: ListingType,
  })
  type: ListingType;

  @Field(() => PromotionStatus)
  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.NONE,
  })
  promotionStatus: PromotionStatus;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  promotionCycle: number;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  featuredStartsAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  featuredEndsAt: Date | null;

  @Field(() => ListingMedia, { nullable: true })
  @Column('jsonb', { nullable: true })
  story: ListingMedia | null;

  @Field(() => [ListingMedia])
  @Column('jsonb')
  photos: ListingMedia[];

  @Field()
  @Column('text')
  tags: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  deactivationReason?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
