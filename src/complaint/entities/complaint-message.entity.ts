import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComplaintMessageAuthorType } from '../enums/complaint-message-author-type.enum';
import { Complaint } from './complaint.entity';

@ObjectType()
@Entity('complaint_messages')
export class ComplaintMessage {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  complaintId: string;

  @ManyToOne(() => Complaint, (complaint) => complaint.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'complaintId' })
  complaint: Complaint;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  authorId: string;

  @Field(() => ComplaintMessageAuthorType)
  @Column({ type: 'enum', enum: ComplaintMessageAuthorType })
  authorType: ComplaintMessageAuthorType;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
