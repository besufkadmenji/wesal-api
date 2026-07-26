import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { CreateNotificationInput } from './dto/create-notification.input';
import { NotificationPaginationInput } from './dto/notification-pagination.input';
import { PaginatedNotificationResponse } from './dto/paginated-notification.response';
import { NotificationStats } from './dto/notification-stats.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Mutation(() => Notification)
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('notification', 'create')
  async createNotification(
    @Args('input') createNotificationInput: CreateNotificationInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Notification> {
    return this.notificationService.create(createNotificationInput, language);
  }

  @Query(() => PaginatedNotificationResponse, { name: 'notifications' })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Args('input', { nullable: true }) input?: NotificationPaginationInput,
    @CurrentPrincipal() principal?: JwtPayload,
  ): Promise<IPaginatedType<Notification>> {
    return this.notificationService.findAll(input ?? {}, principal);
  }

  @Query(() => Notification, { name: 'notification' })
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<Notification> {
    return this.notificationService.findOne(id, language, principal);
  }

  @Mutation(() => Notification)
  @UseGuards(JwtAuthGuard)
  async removeNotification(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<Notification> {
    return this.notificationService.remove(id, language, principal);
  }

  @Mutation(() => Notification, {
    description: 'Mark a notification as read',
  })
  @UseGuards(JwtAuthGuard)
  async markNotificationAsRead(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<Notification> {
    return this.notificationService.markAsRead(id, language, principal);
  }

  @Mutation(() => Notification, {
    description: 'Mark a notification as unread',
  })
  @UseGuards(JwtAuthGuard)
  async markNotificationAsUnread(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<Notification> {
    return this.notificationService.markAsUnread(id, language, principal);
  }

  @Mutation(() => Boolean, {
    description: 'Mark all notifications as read for a user',
  })
  @UseGuards(JwtAuthGuard)
  async markAllNotificationsAsRead(
    @Args('userId') userId: string,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<boolean> {
    void userId;
    return this.notificationService.markAllAsRead(principal);
  }

  @Mutation(() => Boolean, {
    description: 'Mark multiple notifications as read',
  })
  @UseGuards(JwtAuthGuard)
  async markMultipleNotificationsAsRead(
    @Args('ids', { type: () => [String] }) ids: string[],
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<boolean> {
    return this.notificationService.markMultipleAsRead(ids, principal);
  }

  @Mutation(() => Boolean, {
    description: 'Delete all notifications for a user',
  })
  @UseGuards(JwtAuthGuard)
  async deleteAllNotificationsForUser(
    @Args('userId') userId: string,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<boolean> {
    void userId;
    return this.notificationService.deleteAllForUser(principal);
  }

  @Query(() => NotificationStats, {
    name: 'notificationStats',
    description: 'Get notification statistics for a user',
  })
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Args('userId') userId: string,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<NotificationStats> {
    void userId;
    return this.notificationService.getStats(principal);
  }
}
