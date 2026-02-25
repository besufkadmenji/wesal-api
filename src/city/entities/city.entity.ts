import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import type { GeoJSONPolygon } from '../types/geo-boundary.type';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Country } from '../../country/entities/country.entity';
import { CityStatus } from '../enum/city.enum';

@ObjectType()
@Entity('cities')
export class City {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'bigint', unique: true, nullable: true })
  publicId: number | null;

  @Field()
  @Column({ type: 'uuid' })
  countryId: string;

  @Field(() => Country, { nullable: true })
  @ManyToOne(() => Country)
  @JoinColumn({ name: 'countryId' })
  country: Country;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  nameEn: string;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  nameAr: string;

  @Field(() => CityStatus)
  @Column({
    type: 'enum',
    enum: CityStatus,
    default: CityStatus.ACTIVE,
  })
  status: CityStatus;

  @Field(() => GraphQLJSON, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  geoBoundary: GeoJSONPolygon | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
