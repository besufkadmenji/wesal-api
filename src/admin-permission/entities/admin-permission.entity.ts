import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';
import { Permission } from '../../permission/entities/permission.entity';

@ObjectType()
@Entity('admin_permissions')
export class AdminPermission {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  adminId: string;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  permissionId: string;

  @Field(() => Admin)
  @ManyToOne(() => Admin, (admin) => admin.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin?: Admin;

  @Field(() => Permission)
  @ManyToOne(() => Permission, (permission) => permission.adminPermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permissionId' })
  permission?: Permission;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
