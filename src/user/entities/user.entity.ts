import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { Category } from '../../category/entities/category.entity';

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

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  cityId?: string;

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

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
