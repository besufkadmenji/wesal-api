import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { Repository } from 'typeorm';
import { I18nNotFoundException } from '../../lib/errors';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { PUB_SUB } from '../../lib/pubsub/pubsub.module';
import { Admin } from '../admin/entities/admin.entity';
import { AdminStatus } from '../admin/enums/admin-status.enum';
import { Notification } from './entities/notification.entity';
import { NotificationRecipientType } from './enums/notification-recipient-type.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NOTIFICATION_ERROR_CODES } from './errors/notification.error-codes';
import { NOTIFICATION_ERROR_MESSAGES } from './errors/notification.error-messages';

export const ADMIN_NOTIFICATION_ADDED_EVENT = 'adminNotificationAdded';

export type AdminNotificationAddedPayload = {
  adminNotificationAdded: Notification;
};

type Copy = { title: string; message: string };

export interface AdminEvent {
  type: NotificationType;
  ar: Copy;
  en: Copy;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * Dashboard header notifications (BRD 4.3.25). Every active admin gets a
 * copy; text is stored in Arabic with an English translation.
 */
@Injectable()
export class AdminNotificationService {
  private readonly logger = new Logger(AdminNotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  /**
   * Best-effort fan-out: callers invoke this after their own write has
   * succeeded, and a failure here is logged, never thrown.
   */
  async notifyAdmins(event: AdminEvent): Promise<void> {
    try {
      const admins = await this.adminRepository.find({
        select: { id: true },
        where: { status: AdminStatus.ACTIVE },
      });
      if (admins.length === 0) return;
      const saved = await this.notificationRepository.save(
        admins.map((admin) =>
          this.notificationRepository.create({
            recipientId: admin.id,
            recipientType: NotificationRecipientType.ADMIN,
            userId: null,
            type: event.type,
            title: event.ar.title,
            message: event.ar.message,
            translations: { en: event.en },
            relatedEntityType: event.relatedEntityType,
            relatedEntityId: event.relatedEntityId,
            isRead: false,
          }),
        ),
      );
      for (const notification of saved) {
        await this.pubSub.publish(ADMIN_NOTIFICATION_ADDED_EVENT, {
          adminNotificationAdded: notification,
        } satisfies AdminNotificationAddedPayload);
      }
    } catch (error) {
      this.logger.warn(
        `Admin notification ${event.type} failed: ${String(error)}`,
      );
    }
  }

  async list(
    adminId: string,
    page = 1,
    limit = 10,
  ): Promise<IPaginatedType<Notification>> {
    const take = Math.min(Math.max(limit, 1), 50);
    const [items, total] = await this.notificationRepository.findAndCount({
      where: {
        recipientId: adminId,
        recipientType: NotificationRecipientType.ADMIN,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    const totalPages = Math.ceil(total / take);
    return {
      items,
      meta: {
        total,
        page,
        limit: take,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  unreadCount(adminId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        recipientId: adminId,
        recipientType: NotificationRecipientType.ADMIN,
        isRead: false,
      },
    });
  }

  async markRead(
    adminId: string,
    id: string,
    language: LanguageCode,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id,
        recipientId: adminId,
        recipientType: NotificationRecipientType.ADMIN,
      },
    });
    if (!notification) {
      const message = I18nService.translate(
        NOTIFICATION_ERROR_MESSAGES[
          NOTIFICATION_ERROR_CODES.NOTIFICATION_NOT_FOUND
        ],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
    return notification;
  }

  async markAllRead(adminId: string): Promise<boolean> {
    await this.notificationRepository.update(
      {
        recipientId: adminId,
        recipientType: NotificationRecipientType.ADMIN,
        isRead: false,
      },
      { isRead: true, readAt: new Date() },
    );
    return true;
  }
}
