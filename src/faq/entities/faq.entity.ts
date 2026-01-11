import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('faqs')
export class Faq {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  questionEn: string;

  @Field()
  @Column({ type: 'text' })
  questionAr: string;

  @Field()
  @Column({ type: 'text' })
  answerEn: string;

  @Field()
  @Column({ type: 'text' })
  answerAr: string;

  @Field()
  @Column({ type: 'int', default: 0 })
  order: number;

  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
