import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { DeliveryCompanyService } from './delivery-company.service';
import { DeliveryCompanyResolver } from './delivery-company.resolver';
import { DeliveryCompanyController } from './delivery-company.controller';
import { DeliveryCompany } from './entities/delivery-company.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryCompany]),
    AdminPermissionGuardModule,
  ],
  controllers: [DeliveryCompanyController],
  providers: [DeliveryCompanyResolver, DeliveryCompanyService],
  exports: [DeliveryCompanyService],
})
export class DeliveryCompanyModule {}
