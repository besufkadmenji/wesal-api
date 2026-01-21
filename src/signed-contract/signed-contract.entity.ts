import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';
import { SignedContractStatus } from '../user/enums/contract.enum';

@ObjectType()
@Entity('signed_contracts')
export class SignedContract {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'bigint', unique: true, nullable: true })
  publicId: number | null;

  @Field()
  @Column({ type: 'uuid' })
  userId: string;

  @Field(() => User)
  @OneToOne(() => User, (user) => user.signedContract, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  serviceProviderSignature: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  platformManagerName: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  platformManagerSignature: string | null;

  @Field(() => String)
  @Column({ type: 'timestamp' })
  contractSignedAt: Date;

  @Field(() => String, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  contractExpiresAt?: Date | null;

  @Field(() => SignedContractStatus)
  @Column({
    type: 'enum',
    enum: SignedContractStatus,
    default: SignedContractStatus.ACTIVE,
  })
  status: SignedContractStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  terminationReason: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  acceptedRulesEn: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  acceptedRulesAr: string | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
