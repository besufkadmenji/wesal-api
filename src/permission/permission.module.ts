import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { PermissionService } from './permission.service';
import { PermissionResolver } from './permission.resolver';
import { PermissionController } from './permission.controller';
import { Permission } from './entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission]), AdminPermissionGuardModule],
  controllers: [PermissionController],
  providers: [PermissionResolver, PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
