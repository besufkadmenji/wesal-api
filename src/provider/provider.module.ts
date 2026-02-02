import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../admin/entities/admin.entity';
import { Category } from '../category/entities/category.entity';
import { SignedContractModule } from '../signed-contract/signed-contract.module';
import { Provider } from './entities/provider.entity';
import { ProviderResolver } from './provider.resolver';
import { ProviderService } from './provider.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, Admin, Category]),
    SignedContractModule,
  ],
  providers: [ProviderResolver, ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}
