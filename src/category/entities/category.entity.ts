import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
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

  @Field(() => String, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @Field(() => Category, { nullable: true })
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent: Category | null;

  @Field(() => [Category], { nullable: true })
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

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
