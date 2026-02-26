import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { EmailService } from 'lib/email/email.service';
import { Admin } from '../admin/entities/admin.entity';
import { Category } from '../category/entities/category.entity';
import { SignedContractModule } from '../signed-contract/signed-contract.module';
import { Provider } from './entities/provider.entity';
import { ProviderResolver } from './provider.resolver';
import { ProviderService } from './provider.service';
import { ProviderController } from './provider.controller';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, Admin, Category, AdminPermission]),
    SignedContractModule,
    AdminPermissionGuardModule,
  ],
  controllers: [ProviderController],
  providers: [ProviderResolver, ProviderService, EmailService],
  exports: [ProviderService],
})
export class ProviderModule {}
