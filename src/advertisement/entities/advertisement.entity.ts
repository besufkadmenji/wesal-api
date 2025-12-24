import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { User } from '../../user/entities/user.entity';
import { Category } from '../../category/entities/category.entity';
import { City } from '../../city/entities/city.entity';
import { AdvertisementStatus } from '../enums/advertisement-status.enum';
import { AdvertisementMedia } from './advertisement-media.entity';
import { AdvertisementAttributes } from './advertisement-attributes.entity';

@ObjectType()
@Entity('advertisements')
export class Advertisement {
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
  categoryId: string;

  @Field(() => Category)
  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Field()
  @Column({ type: 'uuid' })
  cityId: string;

  @Field(() => City)
  @ManyToOne(() => City)
  @JoinColumn({ name: 'cityId' })
  city: City;

  @Field(() => AdvertisementStatus)
  @Column({
    type: 'enum',
    enum: AdvertisementStatus,
    default: AdvertisementStatus.DRAFT,
  })
  status: AdvertisementStatus;

  @Field(() => [AdvertisementMedia], { nullable: true })
  @OneToMany(() => AdvertisementMedia, (media) => media.advertisement, {
    cascade: true,
  })
  media: AdvertisementMedia[];

  @Field(() => [AdvertisementAttributes], { nullable: true })
  @OneToMany(() => AdvertisementAttributes, (attr) => attr.advertisement, {
    cascade: true,
  })
  attributes: AdvertisementAttributes[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
