import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionService } from './permission.service';
import { PermissionResolver } from './permission.resolver';
import { Permission } from './entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission])],
  providers: [PermissionResolver, PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
