import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryCompanyService } from './delivery-company.service';
import { DeliveryCompanyResolver } from './delivery-company.resolver';
import { DeliveryCompany } from './entities/delivery-company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryCompany])],
  providers: [DeliveryCompanyResolver, DeliveryCompanyService],
  exports: [DeliveryCompanyService],
})
export class DeliveryCompanyModule {}
