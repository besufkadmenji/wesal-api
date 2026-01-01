import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('countries')
export class Country {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 500, unique: true })
  code: string;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 10, nullable: true, unique: true })
  dialCode?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
