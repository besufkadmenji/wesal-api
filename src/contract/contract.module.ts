import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from './contract.service';
import { ContractResolver } from './contract.resolver';
import { Contract } from './entities/contract.entity';
import { ContractSignature } from './entities/contract-signature.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, ContractSignature, Conversation, User]),
  ],
  providers: [ContractResolver, ContractService],
  exports: [ContractService],
})
export class ContractModule {}
