import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { Payment } from '../payment/entities/payment.entity';
import { ReportController } from './report.controller';
import { ReportResolver } from './report.resolver';
import { ReportService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), AdminPermissionGuardModule],
  controllers: [ReportController],
  providers: [ReportService, ReportResolver],
  exports: [ReportService],
})
export class ReportModule {}
