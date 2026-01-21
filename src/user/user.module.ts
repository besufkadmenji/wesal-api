import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { User } from './entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { SignedContractModule } from '../signed-contract/signed-contract.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Category, Admin]),
    SignedContractModule,
  ],
  providers: [UserResolver, UserService],
  exports: [UserService],
})
export class UserModule {}
