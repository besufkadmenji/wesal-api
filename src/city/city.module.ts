import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';
import { User } from 'src/user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { CityController } from './city.controller';
import { CityResolver } from './city.resolver';
import { CityService } from './city.service';
import { City } from './entities/city.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([City, User, Provider, AdminPermission]),
    AdminPermissionGuardModule,
  ],
  controllers: [CityController],
  providers: [CityResolver, CityService],
  exports: [CityService],
})
export class CityModule {}
