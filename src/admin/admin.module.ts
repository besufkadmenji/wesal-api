import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { AdminController } from './admin.controller';
import { Admin } from './entities/admin.entity';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminPermissionGuard } from './guards/admin-permission.guard';
import { AdminPermission } from '../admin-permission/entities/admin-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminPermission]),
    AdminAuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminResolver, AdminService, AdminPermissionGuard],
  exports: [AdminService, AdminPermissionGuard],
})
export class AdminModule {}
