import { ObjectType, Field } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Category } from '../../category/entities/category.entity';
import { City } from '../../city/entities/city.entity';
import { ListingStatus, ListingType } from '../enums/listing.enum';
import { ListingMedia } from './listing-media';

@ObjectType()
@Entity('listing')
export class Listing {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  provider: User;

  @Field()
  @Column('uuid')
  categoryId: string;

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

  @ManyToOne(() => City, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cityId' })
  city: City;

  @Field(() => ListingStatus)
  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.DRAFT,
  })
  status: ListingStatus;

  @Field(() => ListingType)
  @Column({
    type: 'enum',
    enum: ListingType,
  })
  type: ListingType;

  @Field(() => ListingMedia)
  @Column('jsonb')
  story: ListingMedia;

  @Field(() => [ListingMedia])
  @Column('jsonb')
  photos: ListingMedia[];

  @Field()
  @Column('text')
  tags: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
