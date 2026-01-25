import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('categories')
export class Category {
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
  @Column({ type: 'text' })
  image: string;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  nameEn: string;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  nameAr: string;

  @Field()
  @Column({ type: 'text' })
  descriptionEn: string;

  @Field()
  @Column({ type: 'text' })
  descriptionAr: string;

  @Field()
  @Column({ type: 'text', default: '' })
  rulesAr: string;

  @Field()
  @Column({ type: 'text', default: '' })
  rulesEn: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
