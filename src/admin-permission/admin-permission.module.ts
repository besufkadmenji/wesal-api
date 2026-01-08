import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionService } from './admin-permission.service';
import { AdminPermissionResolver } from './admin-permission.resolver';
import { AdminPermission } from './entities/admin-permission.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Permission } from '../permission/entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminPermission, Admin, Permission])],
  providers: [AdminPermissionResolver, AdminPermissionService],
  exports: [AdminPermissionService],
})
export class AdminPermissionModule {}
