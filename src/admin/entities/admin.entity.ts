import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdminPermissionType } from '../enums/admin-permission-type.enum';
import { AdminStatus } from '../enums/admin-status.enum';
import { AdminUserType } from '../enums/admin-user-type.enum';
import { AdminPermission } from '../../admin-permission/entities/admin-permission.entity';

@ObjectType()
@Entity('admins')
export class Admin {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  organizationName: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  roleName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  password?: string | null;

  @Field(() => AdminPermissionType)
  @Column({
    type: 'enum',
    enum: AdminPermissionType,
    default: AdminPermissionType.VIEWER,
  })
  permissionType: AdminPermissionType;

  @Field(() => AdminUserType)
  @Column({
    type: 'enum',
    enum: AdminUserType,
    default: AdminUserType.PLATFORM,
  })
  userType: AdminUserType;

  @Field(() => AdminStatus)
  @Column({
    type: 'enum',
    enum: AdminStatus,
    default: AdminStatus.ACTIVE,
  })
  status: AdminStatus;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AdminPermission, (ap) => ap.admin, { cascade: true })
  adminPermissions?: AdminPermission[];
}
