import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { SignedContractModule } from '../signed-contract/signed-contract.module';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Category, Admin, AdminPermission]),
    SignedContractModule,
    AdminPermissionGuardModule,
  ],
  controllers: [UserController],
  providers: [UserResolver, UserService],
  exports: [UserService],
})
export class UserModule {}
