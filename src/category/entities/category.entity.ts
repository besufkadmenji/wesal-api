import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoryStatus } from '../enum/category.enum';

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

  @Field(() => CategoryStatus)
  @Column({
    type: 'enum',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;

  // --- Per-section fee & contract rules (admin-editable). See BRD § Section
  // Management. Percentages are decimals (e.g. 2.00 = 2%); amounts/fees are in
  // the platform currency; day-limits are whole days. Nullable so admins opt in.
  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionPercent: number | null;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCommissionAmount: number | null;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  depositPercent: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  maxCompletionDays: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  maxTerminationDays: number | null;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  customerConversationFee: number | null;

  @Field()
  @Column({ type: 'boolean', default: false })
  customerConversationFeeEnabled: boolean;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  providerConversationFee: number | null;

  @Field()
  @Column({ type: 'boolean', default: false })
  providerConversationFeeEnabled: boolean;

  @Field()
  @Column({ type: 'boolean', default: false })
  contractDocumentEnabled: boolean;

  @Field()
  @Column({ type: 'text', default: '' })
  contractDocumentText: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
