import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { BankService } from './bank.service';
import { BankResolver } from './bank.resolver';
import { BankController } from './bank.controller';
import { Bank } from './entities/bank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bank]), AdminPermissionGuardModule],
  controllers: [BankController],
  providers: [BankResolver, BankService],
  exports: [BankService],
})
export class BankModule {}
