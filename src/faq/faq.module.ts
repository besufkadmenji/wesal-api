import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { FaqService } from './faq.service';
import { FaqResolver } from './faq.resolver';
import { FaqController } from './faq.controller';
import { Faq } from './entities/faq.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Faq]), AdminPermissionGuardModule],
  controllers: [FaqController],
  providers: [FaqResolver, FaqService],
  exports: [FaqService],
})
export class FaqModule {}
