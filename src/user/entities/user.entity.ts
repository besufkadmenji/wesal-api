import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { Category } from '../../category/entities/category.entity';
import { Country } from '../../country/entities/country.entity';
import { City } from '../../city/entities/city.entity';
import { SignedContract } from './signed.contract';

@ObjectType()
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 10, nullable: true })
  dialCode?: string;

  @Field()
  @Column({ type: 'varchar', length: 500, unique: true })
  phone: string;

  @Field()
  @Column({ type: 'varchar', length: 500, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  password: string;

  @Field()
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Field()
  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Field(() => UserRole)
  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.USER,
  })
  role: UserRole;

  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field(() => UserStatus)
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  deactivationReason?: string | null;

  // Profile fields
  @Field(() => String, {
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarFilename?: string | null;

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

  // Provider-specific fields
  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  address?: string;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 34, nullable: true })
  ibanNumber?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  commercialRegistrationNumber?: string;

  @Field({ nullable: true })
  @Column({ type: 'boolean', default: false })
  withAbsher?: boolean;

  @Field(() => [Category], { nullable: true })
  @ManyToMany(() => Category, { nullable: true })
  @JoinTable({
    name: 'user_categories',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories?: Category[];

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

  @Field(() => SignedContract, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  signedContract?: SignedContract | null;
}
