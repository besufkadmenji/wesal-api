import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { Payment } from './entities/payment.entity';
import { Contract } from '../contract/entities/contract.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Category } from '../category/entities/category.entity';
import { ContractModule } from '../contract/contract.module';
import { Conversation } from '../conversation/entities/conversation.entity';
import { ConversationModule } from '../conversation/conversation.module';
import { SettingModule } from '../setting/setting.module';
import { SearchModule } from '../search/search.module';
import { PaymentCheckoutService } from './payment-checkout.service';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayRegistry } from './gateway/payment-gateway.registry';
import { ContractPaymentResolver } from './contract-payment.resolver';

@Module({
  imports: [
    NotificationModule,
    TypeOrmModule.forFeature([
      Payment,
      Contract,
      Conversation,
      User,
      Provider,
      Listing,
      Category,
    ]),
    ContractModule,
    ConversationModule,
    SettingModule,
    SearchModule,
  ],
  controllers: [PaymentGatewayController],
  providers: [
    PaymentResolver,
    PaymentService,
    PaymentCheckoutService,
    PaymentGatewayRegistry,
    ContractPaymentResolver,
  ],
  exports: [PaymentService, PaymentCheckoutService],
})
export class PaymentModule {}
