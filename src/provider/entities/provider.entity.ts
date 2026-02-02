import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { City } from '../../city/entities/city.entity';
import { Country } from '../../country/entities/country.entity';
import { SignedContract } from '../../signed-contract/signed-contract.entity';
import { ProviderStatus } from '../enums/provider-status.enum';

@ObjectType()
@Entity('providers')
export class Provider {
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

  // Contact Information
  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 10, nullable: true })
  dialCode?: string;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  phone: string;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  email: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  password: string;

  @Field()
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Field()
  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  // Status
  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field(() => ProviderStatus)
  @Column({
    type: 'enum',
    enum: ProviderStatus,
    default: ProviderStatus.PENDING_APPROVAL,
  })
  status: ProviderStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  deactivationReason?: string | null;

  // Profile fields
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  commercialName?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarFilename?: string | null;

  // Location
  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  countryId?: string;

  @Field(() => Country, { nullable: true })
  @ManyToOne(() => Country, { nullable: true })
  @JoinColumn({ name: 'countryId' })
  country?: Country | null;

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  cityId?: string;

  @Field(() => City, { nullable: true })
  @ManyToOne(() => City, { nullable: true })
  @JoinColumn({ name: 'cityId' })
  city?: City | null;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 500, default: 'en' })
  languageCode?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  address?: string;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  // Banking Information
  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 34, nullable: true })
  ibanNumber?: string;

  // Business Registration
  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  commercialRegistrationNumber?: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  commercialRegistrationFilename?: string | null;

  @Field({ nullable: true })
  @Column({ type: 'boolean', default: false })
  withAbsher?: boolean;

  // Categories
  @Field(() => [Category], { nullable: true })
  @ManyToMany(() => Category, { nullable: true })
  @JoinTable({
    name: 'provider_categories',
    joinColumn: { name: 'providerId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories?: Category[];

  // Contract
  @Field(() => SignedContract, { nullable: true })
  @OneToOne(() => SignedContract, (contract) => contract.provider, {
    nullable: true,
    eager: true,
  })
  signedContract?: SignedContract | null;

  // Soft Delete
  @Field(() => String, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  deleteReason?: string | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
