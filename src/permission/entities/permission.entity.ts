import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PermissionPlatform } from '../enums/permission-platform.enum';
import { AdminPermission } from '../../admin-permission/entities/admin-permission.entity';

@ObjectType()
@Entity('permissions')
@Index(['module', 'action', 'resource'], { unique: true })
export class Permission {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  nameAr: string;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field()
  @Column({ type: 'varchar', length: 100 })
  module: string;

  @Field()
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Field()
  @Column({ type: 'varchar', length: 100 })
  resource: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @Field(() => PermissionPlatform)
  @Column({
    type: 'enum',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    enum: PermissionPlatform,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    default: PermissionPlatform.GLOBAL,
  })
  permissionPlatform: PermissionPlatform;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @OneToMany(() => AdminPermission, (ap) => ap.permission, { cascade: true })
  adminPermissions?: AdminPermission[];
}
