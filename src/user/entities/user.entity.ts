import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@ObjectType()
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 500, unique: true })
  phone: string;

  @Field()
  @Column({ type: 'varchar', length: 500, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 500 })
  passwordHash: string;

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
  @Field()
  @Column({ type: 'varchar', length: 500 })
  fullName: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  countryId?: string;

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  cityId?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 500, default: 'en' })
  languageCode?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
