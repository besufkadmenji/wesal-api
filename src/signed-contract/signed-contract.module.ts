import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignedContract } from './signed-contract.entity';
import { SignedContractResolver } from './signed-contract.resolver';
import { SignedContractService } from './signed-contract.service';

@Module({
  imports: [TypeOrmModule.forFeature([SignedContract])],
  providers: [SignedContractResolver, SignedContractService],
  exports: [SignedContractService],
})
export class SignedContractModule {}
