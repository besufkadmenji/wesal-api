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
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
@Entity('categories')
export class Category {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
