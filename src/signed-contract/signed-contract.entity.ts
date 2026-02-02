import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Provider } from '../provider/entities/provider.entity';
import { SignedContractStatus } from '../provider/enums/contract.enum';

@ObjectType()
@Entity('signed_contracts')
export class SignedContract {
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
  providerId: string | null;

  @Field(() => Provider, { nullable: true })
  @OneToOne(() => Provider, (provider) => provider.signedContract, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'providerId' })
  provider?: Provider | null;

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
