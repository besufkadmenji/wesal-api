import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { Message } from '../conversation/entities/message.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Provider } from '../provider/entities/provider.entity';
import { User } from '../user/entities/user.entity';
import { DashboardInsightsResolver } from './dashboard-insights.resolver';
import { DashboardInsightsService } from './dashboard-insights.service';
import { StatisticsResolver } from './statistics.resolver';
import { StatisticsService } from './statistics.service';
import { StatisticsSubscriber } from './statistics.subscriber';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Provider, Contract, Message, Listing]),
  ],
  providers: [
    StatisticsService,
    StatisticsSubscriber,
    StatisticsResolver,
    DashboardInsightsService,
    DashboardInsightsResolver,
  ],
  exports: [StatisticsService],
})
export class StatisticsModule {}
