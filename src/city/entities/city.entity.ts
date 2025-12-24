import { ObjectType, Field, ID } from '@nestjs/graphql';
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

@ObjectType()
@Entity('cities')
export class City {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  countryId: string;

  @Field(() => Country)
  @ManyToOne(() => Country)
  @JoinColumn({ name: 'countryId' })
  country: Country;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
