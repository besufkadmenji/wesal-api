import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { Provider } from '../provider/entities/provider.entity';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { User } from '../user/entities/user.entity';
import { UserStatus } from '../user/enums/user-status.enum';
import { BroadcastPaginationInput } from './dto/broadcast-pagination.input';
import { BroadcastRecipientOption } from './dto/broadcast-recipient-option.response';
import { SendBroadcastInput } from './dto/send-broadcast.input';
import {
  BroadcastRecipient,
  NotificationBroadcast,
} from './entities/notification-broadcast.entity';
import { Notification } from './entities/notification.entity';
import {
  BroadcastAudience,
  BroadcastRecipientType,
} from './enums/broadcast.enum';
import { NotificationRecipientType } from './enums/notification-recipient-type.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NOTIFICATION_ERROR_CODES } from './errors/notification.error-codes';
import { NOTIFICATION_ERROR_MESSAGES } from './errors/notification.error-messages';
import { NotificationService } from './notification.service';

/** Rows per INSERT when fanning a broadcast out to recipients. */
export const BROADCAST_INSERT_CHUNK = 500;
const RECIPIENT_OPTION_LIMIT = 20;

type Recipient = { id: string; type: BroadcastRecipientType; name?: string };

/** Admin broadcasts (BRD 4.3.24): send to active customers and/or providers. */
@Injectable()
export class BroadcastService {
  constructor(
    @InjectRepository(NotificationBroadcast)
    private readonly broadcastRepository: Repository<NotificationBroadcast>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    private readonly notificationService: NotificationService,
  ) {}

  async send(
    input: SendBroadcastInput,
    admin: AdminJwtPayload,
    language: LanguageCode,
  ): Promise<NotificationBroadcast> {
    const title = input.title.trim();
    const message = input.message.trim();
    if (!title) throw this.badRequest('EMPTY_TITLE', language);
    if (!message) throw this.badRequest('EMPTY_MESSAGE', language);
    const types = [...new Set(input.recipientTypes)];
    if (types.length === 0)
      throw this.badRequest('NO_RECIPIENT_TYPES', language);

    const recipients =
      input.audience === BroadcastAudience.ALL
        ? await this.allActive(types)
        : await this.selectedActive(input, types, language);
    if (recipients.length === 0)
      throw this.badRequest('NO_RECIPIENTS', language);

    const { broadcast, notifications } =
      await this.broadcastRepository.manager.transaction(async (manager) => {
        const saved = await manager.save(
          NotificationBroadcast,
          manager.create(NotificationBroadcast, {
            title,
            message,
            recipientTypes: types,
            audience: input.audience,
            recipients:
              input.audience === BroadcastAudience.SELECTED ? recipients : null,
            recipientCount: recipients.length,
            createdByAdminId: admin.sub,
          }),
        );
        const rows = recipients.map((recipient) =>
          manager.create(Notification, {
            recipientId: recipient.id,
            recipientType:
              recipient.type === BroadcastRecipientType.USER
                ? NotificationRecipientType.USER
                : NotificationRecipientType.PROVIDER,
            userId:
              recipient.type === BroadcastRecipientType.USER
                ? recipient.id
                : null,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title,
            message,
            isRead: false,
            relatedEntityId: saved.id,
            relatedEntityType: 'broadcast',
          }),
        );
        const created = await manager.save(Notification, rows, {
          chunk: BROADCAST_INSERT_CHUNK,
        });
        return { broadcast: saved, notifications: created };
      });

    // Real-time delivery after commit, so nobody sees a rolled-back item.
    for (const notification of notifications) {
      await this.notificationService.publishSafely(notification);
    }
    return broadcast;
  }

  async findAll(
    input: BroadcastPaginationInput,
  ): Promise<IPaginatedType<NotificationBroadcast>> {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 10, 100);
    const query = this.broadcastRepository
      .createQueryBuilder('broadcast')
      .orderBy('broadcast.createdAt', input.sortOrder ?? 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (input.search?.trim()) {
      query.andWhere('broadcast.title ILIKE :search', {
        search: `%${input.search.trim()}%`,
      });
    }
    if (input.recipientType) {
      query.andWhere(':recipientType = ANY(broadcast.recipientTypes)', {
        recipientType: input.recipientType,
      });
    }
    const [items, total] = await query.getManyAndCount();
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
    language: LanguageCode,
  ): Promise<NotificationBroadcast> {
    const broadcast = await this.broadcastRepository.findOne({ where: { id } });
    if (!broadcast) {
      const message = this.message('BROADCAST_NOT_FOUND', language);
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }
    return broadcast;
  }

  /** Active accounts matching `search`, for the SELECTED recipient picker. */
  async recipientOptions(
    type: BroadcastRecipientType,
    search?: string,
  ): Promise<BroadcastRecipientOption[]> {
    const term = search?.trim() ? `%${search.trim()}%` : null;
    if (type === BroadcastRecipientType.USER) {
      const query = this.userRepository
        .createQueryBuilder('user')
        .where('user.status = :status', { status: UserStatus.ACTIVE })
        .andWhere('user.isActive = true')
        .andWhere('user.deletedAt IS NULL')
        .orderBy('user.name', 'ASC')
        .take(RECIPIENT_OPTION_LIMIT);
      if (term) {
        query.andWhere(
          '(user.name ILIKE :term OR user.phone ILIKE :term OR user.email ILIKE :term)',
          { term },
        );
      }
      const users = await query.getMany();
      return users.map((user) => ({
        id: user.id,
        type,
        name: user.name ?? user.phone,
        detail: user.phone ?? user.email ?? undefined,
      }));
    }
    const query = this.providerRepository
      .createQueryBuilder('provider')
      .where('provider.status = :status', { status: ProviderStatus.ACTIVE })
      .andWhere('provider.isActive = true')
      .andWhere('provider.deletedAt IS NULL')
      .orderBy('provider.name', 'ASC')
      .take(RECIPIENT_OPTION_LIMIT);
    if (term) {
      query.andWhere(
        '(provider.name ILIKE :term OR provider.commercialName ILIKE :term OR provider.phone ILIKE :term OR provider.email ILIKE :term)',
        { term },
      );
    }
    const providers = await query.getMany();
    return providers.map((provider) => ({
      id: provider.id,
      type,
      name: provider.commercialName ?? provider.name ?? provider.phone,
      detail: provider.phone ?? provider.email ?? undefined,
    }));
  }

  private async allActive(
    types: BroadcastRecipientType[],
  ): Promise<Recipient[]> {
    const recipients: Recipient[] = [];
    if (types.includes(BroadcastRecipientType.USER)) {
      const users = await this.userRepository.find({
        select: { id: true },
        where: {
          status: UserStatus.ACTIVE,
          isActive: true,
          deletedAt: IsNull(),
        },
      });
      recipients.push(
        ...users.map((u) => ({ id: u.id, type: BroadcastRecipientType.USER })),
      );
    }
    if (types.includes(BroadcastRecipientType.PROVIDER)) {
      const providers = await this.providerRepository.find({
        select: { id: true },
        where: {
          status: ProviderStatus.ACTIVE,
          isActive: true,
          deletedAt: IsNull(),
        },
      });
      recipients.push(
        ...providers.map((p) => ({
          id: p.id,
          type: BroadcastRecipientType.PROVIDER,
        })),
      );
    }
    return recipients;
  }

  /** Every selected id must be an active account of an allowed type. */
  private async selectedActive(
    input: SendBroadcastInput,
    types: BroadcastRecipientType[],
    language: LanguageCode,
  ): Promise<Recipient[]> {
    const selected = input.recipients ?? [];
    if (selected.length === 0) {
      throw this.badRequest('RECIPIENTS_REQUIRED', language);
    }
    if (selected.some((recipient) => !types.includes(recipient.type))) {
      throw this.badRequest('INVALID_RECIPIENTS', language);
    }
    const userIds = [
      ...new Set(
        selected
          .filter((r) => r.type === BroadcastRecipientType.USER)
          .map((r) => r.id),
      ),
    ];
    const providerIds = [
      ...new Set(
        selected
          .filter((r) => r.type === BroadcastRecipientType.PROVIDER)
          .map((r) => r.id),
      ),
    ];
    const users = userIds.length
      ? await this.userRepository.find({
          where: {
            id: In(userIds),
            status: UserStatus.ACTIVE,
            isActive: true,
            deletedAt: IsNull(),
          },
        })
      : [];
    const providers = providerIds.length
      ? await this.providerRepository.find({
          where: {
            id: In(providerIds),
            status: ProviderStatus.ACTIVE,
            isActive: true,
            deletedAt: IsNull(),
          },
        })
      : [];
    if (
      users.length !== userIds.length ||
      providers.length !== providerIds.length
    ) {
      throw this.badRequest('INVALID_RECIPIENTS', language);
    }
    return [
      ...users.map((u) => ({
        id: u.id,
        type: BroadcastRecipientType.USER,
        name: u.name ?? undefined,
      })),
      ...providers.map((p) => ({
        id: p.id,
        type: BroadcastRecipientType.PROVIDER,
        name: p.commercialName ?? p.name ?? undefined,
      })),
    ] satisfies BroadcastRecipient[];
  }

  private message(
    code: keyof typeof NOTIFICATION_ERROR_CODES,
    language: LanguageCode,
  ): string {
    return I18nService.translate(
      NOTIFICATION_ERROR_MESSAGES[NOTIFICATION_ERROR_CODES[code]],
      language,
    );
  }

  private badRequest(
    code: keyof typeof NOTIFICATION_ERROR_CODES,
    language: LanguageCode,
  ): I18nBadRequestException {
    const message = this.message(code, language);
    return new I18nBadRequestException({ en: message, ar: message }, language);
  }
}
