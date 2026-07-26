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
import { NotificationRecipientType } from './enums/notification-recipient-type.enum';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

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

    const notification = this.notificationRepository.create({
      ...createNotificationInput,
      recipientId: createNotificationInput.userId,
      recipientType: NotificationRecipientType.USER,
    });
    return await this.notificationRepository.save(notification);
  }

  async createForRecipient(input: {
    recipientId: string;
    recipientType: NotificationRecipientType;
    type: import('./enums/notification-type.enum').NotificationType;
    title: string;
    message: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  }): Promise<Notification> {
    return this.notificationRepository.save(
      this.notificationRepository.create({
        ...input,
        userId:
          input.recipientType === NotificationRecipientType.USER
            ? input.recipientId
            : null,
        isRead: false,
      }),
    );
  }

  async findAll(
    paginationInput: NotificationPaginationInput,
    principal?: JwtPayload,
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

    if (principal) {
      queryBuilder.andWhere(
        'notification.recipientId = :recipientId AND notification.recipientType = :recipientType',
        {
          recipientId: principal.sub,
          recipientType:
            principal.type === 'provider'
              ? NotificationRecipientType.PROVIDER
              : NotificationRecipientType.USER,
        },
      );
    }

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
    principal?: JwtPayload,
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
    if (
      principal &&
      (notification.recipientId !== principal.sub ||
        notification.recipientType !==
          (principal.type === 'provider'
            ? NotificationRecipientType.PROVIDER
            : NotificationRecipientType.USER))
    ) {
      const message = I18nService.translate(
        NOTIFICATION_ERROR_MESSAGES['UNAUTHORIZED_ACCESS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    return notification;
  }

  async remove(
    id: string,
    language: LanguageCode = 'en',
    principal?: JwtPayload,
  ): Promise<Notification> {
    const notification = await this.findOne(id, language, principal);
    await this.notificationRepository.remove(notification);
    return notification;
  }

  async markAsRead(
    id: string,
    language: LanguageCode = 'en',
    principal?: JwtPayload,
  ): Promise<Notification> {
    const notification = await this.findOne(id, language, principal);

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
    principal?: JwtPayload,
  ): Promise<Notification> {
    const notification = await this.findOne(id, language, principal);

    if (notification.isRead) {
      notification.isRead = false;
      notification.readAt = undefined;
      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  async markAllAsRead(principal: JwtPayload): Promise<boolean> {
    const recipientType =
      principal.type === 'provider'
        ? NotificationRecipientType.PROVIDER
        : NotificationRecipientType.USER;
    await this.notificationRepository.update(
      { recipientId: principal.sub, recipientType, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return true;
  }

  async markMultipleAsRead(
    ids: string[],
    principal: JwtPayload,
  ): Promise<boolean> {
    const recipientType =
      principal.type === 'provider'
        ? NotificationRecipientType.PROVIDER
        : NotificationRecipientType.USER;
    await this.notificationRepository.update(
      {
        id: In(ids),
        recipientId: principal.sub,
        recipientType,
        isRead: false,
      },
      { isRead: true, readAt: new Date() },
    );
    return true;
  }

  async deleteAllForUser(principal: JwtPayload): Promise<boolean> {
    await this.notificationRepository.delete({
      recipientId: principal.sub,
      recipientType:
        principal.type === 'provider'
          ? NotificationRecipientType.PROVIDER
          : NotificationRecipientType.USER,
    });
    return true;
  }

  async getStats(principal: JwtPayload): Promise<NotificationStats> {
    const recipient = {
      recipientId: principal.sub,
      recipientType:
        principal.type === 'provider'
          ? NotificationRecipientType.PROVIDER
          : NotificationRecipientType.USER,
    };
    const totalNotifications = await this.notificationRepository.count({
      where: recipient,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { ...recipient, isRead: false },
    });

    const readCount = totalNotifications - unreadCount;

    return {
      totalNotifications,
      unreadCount,
      readCount,
    };
  }
}
