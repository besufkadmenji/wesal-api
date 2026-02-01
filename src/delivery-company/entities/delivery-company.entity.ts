import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeliveryCompanyStatus } from '../enums/delivery-company-status.enum';

@ObjectType()
@Entity('delivery-companies')
export class DeliveryCompany {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  nameEn: string;

  @Field()
  @Column({ type: 'text' })
  nameAr: string;

  @Field(() => DeliveryCompanyStatus)
  @Column({
    type: 'enum',
    enum: DeliveryCompanyStatus,
    default: DeliveryCompanyStatus.ACTIVE,
  })
  status: DeliveryCompanyStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  deactivationReason?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
