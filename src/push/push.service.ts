import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { In, Repository } from 'typeorm';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import type { Notification } from '../notification/entities/notification.entity';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import { localizedNotificationField } from '../notification/notification-texts';
import { PushDevice } from './entities/push-device.entity';
import { readPushCredentials } from './push.config';
import { adminPushLink, pushLink } from './push-link';

const FIREBASE_APP_NAME = 'wesal-push';
/** FCM accepts at most 500 tokens per multicast. */
const MULTICAST_LIMIT = 500;
/** Errors that mean the browser unsubscribed or the token is unusable. */
const DEAD_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Who a browser belongs to: a customer, a provider or an admin. */
export type PushOwner = {
  recipientId: string;
  recipientType: NotificationRecipientType;
};

export const participantOwner = (principal: JwtPayload): PushOwner => ({
  recipientId: principal.sub,
  recipientType:
    principal.type === 'provider'
      ? NotificationRecipientType.PROVIDER
      : NotificationRecipientType.USER,
});

export const adminOwner = (admin: AdminJwtPayload): PushOwner => ({
  recipientId: admin.sub,
  recipientType: NotificationRecipientType.ADMIN,
});

/**
 * ClickUp 869fp1jmt: delivers notifications through FCM so they reach a
 * browser that does not have the site open. Never throws into callers.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private messaging: Messaging | null | undefined;

  constructor(
    @InjectRepository(PushDevice)
    private readonly deviceRepository: Repository<PushDevice>,
  ) {}

  /** Lazily connects to Firebase; null when push is not configured. */
  private getMessagingClient(): Messaging | null {
    if (this.messaging !== undefined) return this.messaging;
    const credentials = readPushCredentials();
    if (!credentials) {
      this.logger.log('FCM push is off: FIREBASE_* env is not set');
      this.messaging = null;
      return null;
    }
    try {
      const app: App = getApps().some((a) => a.name === FIREBASE_APP_NAME)
        ? getApp(FIREBASE_APP_NAME)
        : initializeApp(
            { credential: cert(credentials), projectId: credentials.projectId },
            FIREBASE_APP_NAME,
          );
      this.messaging = getMessaging(app);
    } catch (error) {
      this.logger.error(`FCM push is off: ${String(error)}`);
      this.messaging = null;
    }
    return this.messaging;
  }

  async register(
    token: string,
    language: 'ar' | 'en',
    userAgent: string | null,
    pushOwner: PushOwner,
  ): Promise<boolean> {
    const owner = {
      ...pushOwner,
      language,
      userAgent: userAgent?.slice(0, 512) ?? null,
    };
    const existing = await this.deviceRepository.findOne({ where: { token } });
    await this.deviceRepository.save(
      existing
        ? Object.assign(existing, owner)
        : this.deviceRepository.create({ token, ...owner }),
    );
    return true;
  }

  async unregister(token: string, owner: PushOwner): Promise<boolean> {
    await this.deviceRepository.delete({ token, ...owner });
    return true;
  }

  async sendForNotification(notification: Notification): Promise<void> {
    try {
      const messaging = this.getMessagingClient();
      if (!messaging) return;
      const devices = await this.deviceRepository.find({
        where: {
          recipientId: notification.recipientId,
          recipientType: notification.recipientType,
        },
      });
      if (devices.length === 0) return;

      // Admin notifications open the admin panel, the rest the website.
      const link = (
        notification.recipientType === NotificationRecipientType.ADMIN
          ? adminPushLink
          : pushLink
      )(notification.relatedEntityType, notification.relatedEntityId);
      const dead: string[] = [];
      for (const language of ['ar', 'en'] as const) {
        const tokens = devices
          .filter((device) => (device.language ?? 'ar') === language)
          .map((device) => device.token);
        for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
          const batch = tokens.slice(i, i + MULTICAST_LIMIT);
          // Data-only: the site's service worker decides how to show it.
          const result = await messaging.sendEachForMulticast({
            tokens: batch,
            data: {
              notificationId: notification.id,
              title: localizedNotificationField(
                notification,
                'title',
                language,
              ),
              body: localizedNotificationField(
                notification,
                'message',
                language,
              ),
              link,
              lang: language,
            },
            webpush: { headers: { Urgency: 'high', TTL: '86400' } },
          });
          result.responses.forEach((response, index) => {
            if (
              !response.success &&
              response.error &&
              DEAD_TOKEN_ERRORS.has(response.error.code)
            ) {
              dead.push(batch[index]);
            }
          });
        }
      }
      if (dead.length > 0) {
        await this.deviceRepository.delete({ token: In(dead) });
      }
    } catch (error) {
      this.logger.warn(
        `Push for notification ${notification.id} failed: ${String(error)}`,
      );
    }
  }
}
