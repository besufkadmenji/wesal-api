import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushDevice } from './entities/push-device.entity';
import { PushResolver } from './push.resolver';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushDevice])],
  providers: [PushService, PushResolver],
  exports: [PushService],
})
export class PushModule {}
