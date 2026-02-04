import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaqService } from './faq.service';
import { FaqResolver } from './faq.resolver';
import { FaqController } from './faq.controller';
import { Faq } from './entities/faq.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Faq])],
  controllers: [FaqController],
  providers: [FaqResolver, FaqService],
  exports: [FaqService],
})
export class FaqModule {}
