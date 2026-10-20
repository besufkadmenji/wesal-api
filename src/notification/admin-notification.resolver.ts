import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { GetLanguage } from '../../lib/i18n';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { PUB_SUB } from '../../lib/pubsub/pubsub.module';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { WsAdminAuthGuard } from '../admin/guards/ws-admin-auth.guard';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import {
  ADMIN_NOTIFICATION_ADDED_EVENT,
  AdminNotificationAddedPayload,
  AdminNotificationService,
} from './admin-notification.service';
import { PaginatedNotificationResponse } from './dto/paginated-notification.response';
import { Notification } from './entities/notification.entity';

/** Dashboard header bell (BRD 4.3.25); every admin sees only their own copy. */
@Resolver(() => Notification)
export class AdminNotificationResolver {
  constructor(
    private readonly adminNotificationService: AdminNotificationService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => PaginatedNotificationResponse)
  @UseGuards(AdminAuthGuard)
  adminNotifications(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<IPaginatedType<Notification>> {
    return this.adminNotificationService.list(admin.sub, page, limit);
  }

  @Query(() => Int, { description: 'Unread header notifications' })
  @UseGuards(AdminAuthGuard)
  adminUnreadNotificationCount(
    @CurrentAdmin() admin: AdminJwtPayload,
  ): Promise<number> {
    return this.adminNotificationService.unreadCount(admin.sub);
  }

  @Mutation(() => Notification)
  @UseGuards(AdminAuthGuard)
  adminMarkNotificationRead(
    @Args('id', { type: () => ID }) id: string,
    @CurrentAdmin() admin: AdminJwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Notification> {
    return this.adminNotificationService.markRead(admin.sub, id, language);
  }

  @Mutation(() => Boolean)
  @UseGuards(AdminAuthGuard)
  adminMarkAllNotificationsRead(
    @CurrentAdmin() admin: AdminJwtPayload,
  ): Promise<boolean> {
    return this.adminNotificationService.markAllRead(admin.sub);
  }

  @Subscription(() => Notification, {
    filter: (
      payload: AdminNotificationAddedPayload,
      _variables: unknown,
      context: { admin?: AdminJwtPayload },
    ) => payload.adminNotificationAdded.recipientId === context.admin?.sub,
  })
  @UseGuards(WsAdminAuthGuard)
  adminNotificationAdded() {
    return this.pubSub.asyncIterableIterator(ADMIN_NOTIFICATION_ADDED_EVENT);
  }
}
