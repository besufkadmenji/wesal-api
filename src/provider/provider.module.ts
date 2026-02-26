import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from 'lib/email/email.service';
import { Admin } from '../admin/entities/admin.entity';
import { Category } from '../category/entities/category.entity';
import { SignedContractModule } from '../signed-contract/signed-contract.module';
import { Provider } from './entities/provider.entity';
import { ProviderResolver } from './provider.resolver';
import { ProviderService } from './provider.service';
import { ProviderController } from './provider.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, Admin, Category]),
    SignedContractModule,
  ],
  controllers: [ProviderController],
  providers: [ProviderResolver, ProviderService, EmailService],
  exports: [ProviderService],
})
export class ProviderModule {}

