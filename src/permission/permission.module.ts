import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { PermissionService } from './permission.service';
import { PermissionResolver } from './permission.resolver';
import { PermissionController } from './permission.controller';
import { Permission } from './entities/permission.entity';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, AdminPermission]),
    AdminPermissionGuardModule,
  ],
  controllers: [PermissionController],
  providers: [PermissionResolver, PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
