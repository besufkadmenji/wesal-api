import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { NotificationController } from './notification.controller';
import { Notification } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { AdminPermission } from '../admin-permission/entities/admin-permission.entity';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { NotificationBroadcast } from './entities/notification-broadcast.entity';
import { BroadcastService } from './broadcast.service';
import { BroadcastResolver } from './broadcast.resolver';
import { Admin } from '../admin/entities/admin.entity';
import { AdminNotificationService } from './admin-notification.service';
import { AdminNotificationResolver } from './admin-notification.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationBroadcast,
      User,
      Provider,
      AdminPermission,
      Admin,
    ]),
    AdminPermissionGuardModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationResolver,
    NotificationService,
    BroadcastResolver,
    BroadcastService,
    AdminNotificationResolver,
    AdminNotificationService,
  ],
  exports: [NotificationService, AdminNotificationService],
})
export class NotificationModule {}
