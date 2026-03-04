import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from 'lib/email/email.service';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';
import { Setting } from 'src/setting/entities/setting.entity';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { Admin } from '../admin/entities/admin.entity';
import { Category } from '../category/entities/category.entity';
import { SettingService } from '../setting/setting.service';
import { SignedContract } from '../signed-contract/signed-contract.entity';
import { SignedContractModule } from '../signed-contract/signed-contract.module';
import { Provider } from './entities/provider.entity';
import { ProviderController } from './provider.controller';
import { ProviderResolver } from './provider.resolver';
import { ProviderService } from './provider.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      Admin,
      Category,
      AdminPermission,
      SignedContract,
      Setting,
    ]),
    SignedContractModule,
    AdminPermissionGuardModule,
  ],
  controllers: [ProviderController],
  providers: [ProviderResolver, ProviderService, EmailService, SettingService],
  exports: [ProviderService],
})
export class ProviderModule {}
