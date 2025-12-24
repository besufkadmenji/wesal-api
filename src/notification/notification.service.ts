import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateNotificationInput } from './dto/create-notification.input';
import { NotificationPaginationInput } from './dto/notification-pagination.input';
import { NotificationStats } from './dto/notification-stats.response';
import { Notification } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { NOTIFICATION_ERROR_MESSAGES } from './errors/notification.error-messages';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createNotificationInput: CreateNotificationInput,
    language: LanguageCode = 'en',
  ): Promise<Notification> {
    // Validate title
    if (!createNotificationInput.title.trim()) {
      const message = I18nService.translate(
        NOTIFICATION_ERROR_MESSAGES['EMPTY_TITLE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate message
    if (!createNotificationInput.message.trim()) {
      const message = I18nService.translate(
        NOTIFICATION_ERROR_MESSAGES['EMPTY_MESSAGE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createNotificationInput.userId },
    });
    if (!user) {
      const message = I18nService.translate(
        NOTIFICATION_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    const notification = this.notificationRepository.create(
      createNotificationInput,
    );
    return await this.notificationRepository.save(notification);
  }

  async findAll(
    paginationInput: NotificationPaginationInput,
  ): Promise<IPaginatedType<Notification>> {
    const {
      page = 1,
      limit = 10,
      userId,
      type,
      isRead,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user');

    if (userId) {
      queryBuilder.andWhere('notification.userId = :userId', { userId });
    }

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    const orderByField = sortBy
      ? `notification.${sortBy}`
      : 'notification.createdAt';
    const orderDirection = sortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(orderByField, orderDirection)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notification) {
      const message = I18nService.translate(
        NOTIFICATION_ERROR_MESSAGES['NOTIFICATION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return notification;
  }

  async remove(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Notification> {
    const notification = await this.findOne(id, language);
    await this.notificationRepository.remove(notification);
    return notification;
  }

  async markAsRead(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Notification> {
    const notification = await this.findOne(id, language);

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  async markAsUnread(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Notification> {
    const notification = await this.findOne(id, language);

    if (notification.isRead) {
      notification.isRead = false;
      notification.readAt = undefined;
      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return true;
  }

  async markMultipleAsRead(ids: string[]): Promise<boolean> {
    await this.notificationRepository.update(
      { id: In(ids), isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return true;
  }

  async deleteAllForUser(userId: string): Promise<boolean> {
    await this.notificationRepository.delete({ userId });
    return true;
  }

  async getStats(userId: string): Promise<NotificationStats> {
    const totalNotifications = await this.notificationRepository.count({
      where: { userId },
    });

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    const readCount = totalNotifications - unreadCount;

    return {
      totalNotifications,
      unreadCount,
      readCount,
    };
  }
}
