import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Contract } from './contract.entity';
import { ContractSignerType } from '../enums/contract-signer-type.enum';
import { ContractSignatureType } from '../enums/contract-signature-type.enum';

@ObjectType()
@Entity('contract_signatures')
@Unique(['contractId', 'signatureType'])
export class ContractSignature {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  contractId: string;

  @Field(() => Contract)
  @ManyToOne(() => Contract, (contract) => contract.signatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Field()
  @Column({ type: 'uuid' })
  signerId: string;

  @Field(() => ContractSignerType)
  @Column({ type: 'enum', enum: ContractSignerType })
  signerType: ContractSignerType;

  @Field(() => ContractSignatureType)
  @Column({ type: 'enum', enum: ContractSignatureType })
  signatureType: ContractSignatureType;

  @Field()
  @Column({ type: 'text' })
  signatureData: string;

  @Field()
  @CreateDateColumn()
  signedAt: Date;
}
