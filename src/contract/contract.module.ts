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
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { ContractSettlement } from './entities/contract-settlement.entity';
import { ContractAudit } from './entities/contract-audit.entity';
import { ContractDocument } from './entities/contract-document.entity';
import { Payment } from '../payment/entities/payment.entity';
import { ContractController } from './contract.controller';
import { ContractDocumentService } from './contract-document.service';
import { ParticipantContractDocumentController } from './participant-contract-document.controller';
import { FileUploadModule } from '../../lib/file-upload';
import { NotificationModule } from '../notification/notification.module';

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
      ContractSettlement,
      ContractAudit,
      ContractDocument,
      Payment,
    ]),
    SettingModule,
    ConversationModule,
    AdminPermissionGuardModule,
    FileUploadModule,
    NotificationModule,
  ],
  providers: [ContractResolver, ContractService, ContractDocumentService],
  controllers: [ContractController, ParticipantContractDocumentController],
  exports: [ContractService],
})
export class ContractModule {}
