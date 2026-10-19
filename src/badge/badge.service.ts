import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, QueryFailedError, Repository } from 'typeorm';
import { I18nBadRequestException } from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';
import type { BilingualText } from '../notification/notification-texts';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { NotificationService } from '../notification/notification.service';
import { AdminNotificationService } from '../notification/admin-notification.service';
import { Provider } from '../provider/entities/provider.entity';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { ProviderService } from '../provider/provider.service';
import {
  TIER_ORDER,
  TierRule,
  isEmpty,
  overlaps,
  rangeOf,
  resolveTier,
  upperEnd,
} from './badge-thresholds';
import { UpdateBadgeSettingsInput } from './dto/update-badge-settings.input';
import { BadgeRun, BadgeRunProvider } from './entities/badge-run.entity';
import { BadgeSetting } from './entities/badge-setting.entity';
import { BadgeBound } from './enums/badge-bound.enum';
import { BadgeTier } from './enums/badge-tier.enum';
import { BADGE_ERROR_CODES } from './errors/badge.error-codes';
import { BADGE_ERROR_MESSAGES } from './errors/badge.error-messages';

export const BADGE_TIME_ZONE = 'Asia/Riyadh';

/** Contract states that block auto-deletion (BRD 4.3.7.2 / Q-B4). */
export const UNFINISHED_CONTRACT_STATUSES: ContractStatus[] = [
  ContractStatus.PENDING,
  ContractStatus.ACCEPTED,
  ContractStatus.IN_PROGRESS,
  ContractStatus.AWAITING_CUSTOMER_CONFIRMATION,
  ContractStatus.DELIVERY_IN_PROGRESS,
  ContractStatus.CANCELLATION_REQUESTED,
  ContractStatus.DISPUTED,
];

const TIER_NAMES: Record<BadgeTier, { en: string; ar: string }> = {
  [BadgeTier.TRUST]: { en: 'Trust badge', ar: 'وسام الثقة' },
  [BadgeTier.DILIGENCE]: { en: 'Diligence badge', ar: 'وسام الاجتهاد' },
  [BadgeTier.UNDER_IMPROVEMENT]: {
    en: '"Under improvement" title',
    ar: 'لقب قيد التحسن',
  },
};

/** "Riyadh" month of a date, e.g. 2026-10. */
export function badgePeriod(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BADGE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  })
    .format(date)
    .slice(0, 7);
}

@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    @InjectRepository(BadgeSetting)
    private readonly settingRepository: Repository<BadgeSetting>,
    @InjectRepository(BadgeRun)
    private readonly runRepository: Repository<BadgeRun>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly notificationService: NotificationService,
    private readonly providerService: ProviderService,
    @Optional()
    private readonly adminNotifications?: AdminNotificationService,
  ) {}

  /** All three tiers, highest first; missing rows read as unset and disabled. */
  async settings(): Promise<BadgeSetting[]> {
    const rows = await this.settingRepository.find();
    return TIER_ORDER.map(
      (tier) =>
        rows.find((row) => row.tier === tier) ??
        Object.assign(new BadgeSetting(), {
          tier,
          maxBound: null,
          minBound: null,
          enabled: false,
          updatedAt: new Date(0),
        }),
    );
  }

  async updateSettings(
    input: UpdateBadgeSettingsInput,
    language: LanguageCode,
  ): Promise<BadgeSetting[]> {
    const tiers = input.settings.map((setting) => setting.tier);
    if (new Set(tiers).size !== tiers.length) {
      throw this.badRequest('DUPLICATE_TIER', language);
    }

    const current = await this.settings();
    const merged: TierRule[] = current.map((setting) => {
      const update = input.settings.find((item) => item.tier === setting.tier);
      return update
        ? {
            tier: setting.tier,
            maxBound: update.maxBound ?? null,
            minBound: update.minBound ?? null,
            enabled: update.enabled,
          }
        : setting;
    });
    this.validate(merged, language);

    await this.settingRepository.save(
      merged.map((rule) => this.settingRepository.create(rule)),
    );
    return this.settings();
  }

  /** Throws the BRD alert for the first invalid rule. */
  validate(rules: TierRule[], language: LanguageCode): void {
    for (const rule of rules) {
      if (rule.maxBound === BadgeBound.ZERO) {
        throw this.badRequest('INVALID_MAX', language);
      }
      if (!rule.enabled) continue;
      if (!rule.maxBound || !rule.minBound) {
        throw this.badRequest('BOUNDS_REQUIRED', language);
      }
      if (
        isEmpty(rangeOf({ maxBound: rule.maxBound, minBound: rule.minBound }))
      ) {
        throw this.badRequest('MIN_ABOVE_MAX', language);
      }
    }
    const enabled = rules.filter((rule) => rule.enabled);
    for (let i = 0; i < enabled.length; i++) {
      for (let j = i + 1; j < enabled.length; j++) {
        const a = enabled[i];
        const b = enabled[j];
        if (
          overlaps(
            rangeOf({ maxBound: a.maxBound!, minBound: a.minBound! }),
            rangeOf({ maxBound: b.maxBound!, minBound: b.minBound! }),
          )
        ) {
          throw this.badRequest('TIERS_OVERLAP', language);
        }
      }
    }
  }

  async lastRun(): Promise<BadgeRun | null> {
    return this.runRepository.findOne({
      where: {},
      order: { ranAt: 'DESC' },
    });
  }

  /** BRD 4.3.18: badges are assigned automatically on the 1st of each month. */
  @Cron('0 0 1 * *', { timeZone: BADGE_TIME_ZONE })
  async scheduledRun(): Promise<void> {
    try {
      await this.runAssignment(badgePeriod(), 'en');
    } catch (error) {
      this.logger.error('Monthly badge assignment failed', error);
    }
  }

  /**
   * Assigns badges for `period`, warns Under-improvement holders and deletes
   * those still Under-improvement a month later. Runs at most once per period.
   */
  async runAssignment(
    period: string,
    language: LanguageCode,
  ): Promise<BadgeRun> {
    const run = await this.claimPeriod(period, language);
    const startedAt = run.ranAt;
    const rules = await this.settings();
    const providers = await this.providerRepository.find({
      where: {
        status: ProviderStatus.ACTIVE,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const deleted: BadgeRunProvider[] = [];
    const newlyUnderImprovement: BadgeRunProvider[] = [];
    const skipped: BadgeRunProvider[] = [];
    const counts = { trust: 0, diligence: 0, underImprovement: 0, changed: 0 };

    const evaluated: string[] = [];
    for (const provider of providers) {
      const tier =
        provider.ratingCount > 0
          ? resolveTier(provider.ratingAverage, rules)
          : null;
      const wasUnderImprovement =
        provider.badge === BadgeTier.UNDER_IMPROVEMENT &&
        provider.underImprovementSince !== null &&
        provider.underImprovementSince < startedAt;

      if (tier === BadgeTier.UNDER_IMPROVEMENT && wasUnderImprovement) {
        if (await this.hasUnfinishedContracts(provider.id)) {
          skipped.push({ id: provider.id, name: provider.name ?? undefined });
        } else {
          await this.providerService.autoDeleteForLowRating(
            provider.id,
            this.deletionReason(provider),
          );
          deleted.push({ id: provider.id, name: provider.name ?? undefined });
          continue;
        }
      }

      if (tier !== provider.badge) {
        counts.changed++;
        await this.providerRepository.update(provider.id, {
          badge: tier,
          badgeAssignedAt: startedAt,
          underImprovementSince:
            tier === BadgeTier.UNDER_IMPROVEMENT ? startedAt : null,
        });
        if (tier && tier !== BadgeTier.UNDER_IMPROVEMENT) {
          await this.notify(provider, NotificationType.BADGE_CHANGED, tier);
        }
        if (tier === BadgeTier.UNDER_IMPROVEMENT) {
          newlyUnderImprovement.push({
            id: provider.id,
            name: provider.name ?? undefined,
          });
        }
      }

      evaluated.push(provider.id);
      if (tier === BadgeTier.TRUST) counts.trust++;
      if (tier === BadgeTier.DILIGENCE) counts.diligence++;
      if (tier === BadgeTier.UNDER_IMPROVEMENT) {
        counts.underImprovement++;
        const rule = rules.find((r) => r.tier === tier);
        await this.notify(
          provider,
          NotificationType.BADGE_WARNING,
          tier,
          rule?.maxBound ?? null,
        );
      }
    }
    // Every evaluated provider, even with an unchanged or no tier, has now
    // been through a run and is no longer "Newly Added" (S4-54).
    if (evaluated.length > 0) {
      await this.providerRepository.update(
        { id: In(evaluated) },
        { badgeEvaluatedAt: startedAt },
      );
    }

    run.trustCount = counts.trust;
    run.diligenceCount = counts.diligence;
    run.underImprovementCount = counts.underImprovement;
    run.changedCount = counts.changed;
    run.deletedProviders = deleted;
    run.skippedProviders = skipped;
    const saved = await this.runRepository.save(run);
    await this.notifyAdminsOfRun(newlyUnderImprovement, deleted);
    return saved;
  }

  /** BRD 4.3.25 / 4.3.18: admin header lists new Under-improvement and deleted providers. */
  private async notifyAdminsOfRun(
    underImprovement: BadgeRunProvider[],
    deleted: BadgeRunProvider[],
  ): Promise<void> {
    if (!this.adminNotifications) return;
    const names = (list: BadgeRunProvider[]) =>
      list.map((provider) => provider.name ?? provider.id).join('، ');
    if (underImprovement.length > 0) {
      await this.adminNotifications.notifyAdmins({
        type: NotificationType.ADMIN_BADGE_UNDER_IMPROVEMENT,
        ar: {
          title: 'مقدمو خدمة بلقب قيد التحسن',
          message: `حصل على لقب قيد التحسن: ${names(underImprovement)}`,
        },
        en: {
          title: 'Providers under improvement',
          message: `"Under improvement" given to: ${names(underImprovement)}`,
        },
        relatedEntityType: 'badge',
      });
    }
    if (deleted.length > 0) {
      await this.adminNotifications.notifyAdmins({
        type: NotificationType.ADMIN_BADGE_DELETED,
        ar: {
          title: 'حذف مقدمي خدمة تلقائياً',
          message: `تم حذف الحسابات التالية لبقائها قيد التحسن: ${names(deleted)}`,
        },
        en: {
          title: 'Providers deleted automatically',
          message: `Deleted for staying under improvement: ${names(deleted)}`,
        },
        relatedEntityType: 'badge',
      });
    }
  }

  /** Inserts the run row first; the unique period makes a second run fail. */
  private async claimPeriod(
    period: string,
    language: LanguageCode,
  ): Promise<BadgeRun> {
    try {
      return await this.runRepository.save(
        this.runRepository.create({
          period,
          deletedProviders: [],
          skippedProviders: [],
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string } | undefined)?.code === '23505'
      ) {
        throw this.badRequest('RUN_EXISTS', language);
      }
      throw error;
    }
  }

  private async hasUnfinishedContracts(providerId: string): Promise<boolean> {
    const count = await this.contractRepository.count({
      where: { providerId, status: In(UNFINISHED_CONTRACT_STATUSES) },
    });
    return count > 0;
  }

  private deletionReason(provider: Provider): string {
    return provider.languageCode === 'en'
      ? 'Your account was deleted because your rating stayed in the "Under improvement" range for a full month, and your electronic contract has been terminated.'
      : 'تم حذف حسابك لبقاء تقييمك ضمن نطاق "قيد التحسن" لمدة شهر كامل، وتم فسخ العقد الإلكتروني الخاص بك.';
  }

  private async notify(
    provider: Provider,
    type: NotificationType,
    tier: BadgeTier,
    maxBound: BadgeBound | null = null,
  ): Promise<void> {
    const name = TIER_NAMES[tier];
    let text: BilingualText;
    if (type === NotificationType.BADGE_WARNING) {
      // "=x" max: must rise above x; "<x" max: reaching x is enough.
      const end = maxBound ? upperEnd(maxBound) : { value: 0, inclusive: true };
      const targetEn = end.inclusive
        ? `above ${end.value} stars`
        : `to ${end.value} stars or more`;
      const targetAr = end.inclusive
        ? `إلى أعلى من ${end.value} نجوم`
        : `إلى ${end.value} نجوم أو أكثر`;
      text = {
        ar: {
          title: 'تنبيه: لقب قيد التحسن',
          message: `حصلت على ${name.ar}. إذا لم يتحسن تقييمك ${targetAr} خلال شهر، سيتم حذف حسابك.`,
        },
        en: {
          title: 'Warning: "Under improvement"',
          message: `You received the ${name.en}. If your rating does not improve ${targetEn} within one month, your account will be deleted.`,
        },
      };
    } else {
      text = {
        ar: { title: 'وسام جديد', message: `تهانينا! حصلت على ${name.ar}.` },
        en: {
          title: 'New badge',
          message: `Congratulations! You earned the ${name.en}.`,
        },
      };
    }
    await this.notificationService.notifyLocalized({
      recipientId: provider.id,
      recipientType: NotificationRecipientType.PROVIDER,
      type,
      text,
      relatedEntityId: provider.id,
      relatedEntityType: 'provider',
    });
  }

  private badRequest(
    code: keyof typeof BADGE_ERROR_CODES,
    language: LanguageCode,
  ): I18nBadRequestException {
    const message = I18nService.translate(
      BADGE_ERROR_MESSAGES[BADGE_ERROR_CODES[code]],
      language,
    );
    return new I18nBadRequestException({ en: message, ar: message }, language);
  }
}
