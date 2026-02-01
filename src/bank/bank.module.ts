import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankService } from './bank.service';
import { BankResolver } from './bank.resolver';
import { Bank } from './entities/bank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bank])],
  providers: [BankResolver, BankService],
  exports: [BankService],
})
export class BankModule {}
