import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from './contract.service';
import { ContractResolver } from './contract.resolver';
import { Contract } from './entities/contract.entity';
import { ContractSignature } from './entities/contract-signature.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Category } from '../category/entities/category.entity';
import { DeliveryCompany } from '../delivery-company/entities/delivery-company.entity';
import { SettingModule } from '../setting/setting.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contract,
      ContractSignature,
      Conversation,
      User,
      Provider,
      Listing,
      Category,
      DeliveryCompany,
    ]),
    SettingModule,
    ConversationModule,
  ],
  providers: [ContractResolver, ContractService],
  exports: [ContractService],
})
export class ContractModule {}
