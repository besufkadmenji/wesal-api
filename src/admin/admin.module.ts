import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { Admin } from './entities/admin.entity';
import { AdminAuthModule } from './auth/admin-auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Admin]), AdminAuthModule],
  providers: [AdminResolver, AdminService],
  exports: [AdminService],
})
export class AdminModule {}
