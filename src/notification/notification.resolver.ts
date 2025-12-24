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

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Mutation(() => Notification)
  async createNotification(
    @Args('input') createNotificationInput: CreateNotificationInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Notification> {
    return this.notificationService.create(createNotificationInput, language);
  }

  @Query(() => PaginatedNotificationResponse, { name: 'notifications' })
  async findAll(
    @Args('input', { nullable: true }) input?: NotificationPaginationInput,
  ): Promise<IPaginatedType<Notification>> {
    return this.notificationService.findAll(input ?? {});
  }

  @Query(() => Notification, { name: 'notification' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Notification> {
    return this.notificationService.findOne(id, language);
  }

  @Mutation(() => Notification)
  async removeNotification(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Notification> {
    return this.notificationService.remove(id, language);
  }

  @Mutation(() => Notification, {
    description: 'Mark a notification as read',
  })
  async markNotificationAsRead(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Notification> {
    return this.notificationService.markAsRead(id, language);
  }

  @Mutation(() => Notification, {
    description: 'Mark a notification as unread',
  })
  async markNotificationAsUnread(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Notification> {
    return this.notificationService.markAsUnread(id, language);
  }

  @Mutation(() => Boolean, {
    description: 'Mark all notifications as read for a user',
  })
  async markAllNotificationsAsRead(
    @Args('userId') userId: string,
  ): Promise<boolean> {
    return this.notificationService.markAllAsRead(userId);
  }

  @Mutation(() => Boolean, {
    description: 'Mark multiple notifications as read',
  })
  async markMultipleNotificationsAsRead(
    @Args('ids', { type: () => [String] }) ids: string[],
  ): Promise<boolean> {
    return this.notificationService.markMultipleAsRead(ids);
  }

  @Mutation(() => Boolean, {
    description: 'Delete all notifications for a user',
  })
  async deleteAllNotificationsForUser(
    @Args('userId') userId: string,
  ): Promise<boolean> {
    return this.notificationService.deleteAllForUser(userId);
  }

  @Query(() => NotificationStats, {
    name: 'notificationStats',
    description: 'Get notification statistics for a user',
  })
  async getStats(@Args('userId') userId: string): Promise<NotificationStats> {
    return this.notificationService.getStats(userId);
  }
}
