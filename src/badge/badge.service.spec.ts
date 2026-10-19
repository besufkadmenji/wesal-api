import { FindOperator, QueryFailedError, Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { NotificationService } from '../notification/notification.service';
import { Provider } from '../provider/entities/provider.entity';
import { ProviderService } from '../provider/provider.service';
import { badgePeriod, BadgeService } from './badge.service';
import { BadgeRun } from './entities/badge-run.entity';
import { BadgeSetting } from './entities/badge-setting.entity';
import { BadgeBound } from './enums/badge-bound.enum';
import { BadgeTier } from './enums/badge-tier.enum';

const ENABLED_RULES: Partial<BadgeSetting>[] = [
  {
    tier: BadgeTier.TRUST,
    maxBound: BadgeBound.EQ_5,
    minBound: BadgeBound.EQ_4,
    enabled: true,
  },
  {
    tier: BadgeTier.DILIGENCE,
    maxBound: BadgeBound.LT_4,
    minBound: BadgeBound.EQ_3,
    enabled: true,
  },
  {
    tier: BadgeTier.UNDER_IMPROVEMENT,
    maxBound: BadgeBound.LT_3,
    minBound: BadgeBound.ZERO,
    enabled: true,
  },
];

const provider = (overrides: Partial<Provider>): Provider =>
  ({
    id: 'p',
    name: 'Provider',
    languageCode: 'en',
    ratingAverage: 0,
    ratingCount: 0,
    badge: null,
    underImprovementSince: null,
    ...overrides,
  }) as Provider;

describe('BadgeService', () => {
  let settings: Partial<BadgeSetting>[];
  let providers: Provider[];
  let unfinished: Record<string, number>;
  let savedRuns: BadgeRun[];
  let providerUpdate: jest.Mock;
  let notify: jest.Mock;
  let autoDelete: jest.Mock;
  let runSave: jest.Mock;
  let service: BadgeService;

  beforeEach(() => {
    settings = ENABLED_RULES.map((rule) => ({ ...rule }));
    providers = [];
    unfinished = {};
    savedRuns = [];
    providerUpdate = jest.fn(() => Promise.resolve());
    notify = jest.fn(() => Promise.resolve());
    autoDelete = jest.fn(() => Promise.resolve());
    runSave = jest.fn((run: BadgeRun) => {
      if (!run.ranAt) {
        if (savedRuns.some((existing) => existing.period === run.period)) {
          const error = new QueryFailedError('INSERT', [], new Error('dup'));
          (error as unknown as { driverError: { code: string } }).driverError =
            { code: '23505' };
          return Promise.reject(error);
        }
        run.ranAt = new Date();
        savedRuns.push(run);
      }
      return Promise.resolve(run);
    });

    service = new BadgeService(
      {
        find: jest.fn(() => Promise.resolve(settings)),
        create: jest.fn((value: unknown) => value),
        save: jest.fn((value: unknown) => Promise.resolve(value)),
      } as unknown as Repository<BadgeSetting>,
      {
        create: jest.fn((value: Partial<BadgeRun>) => ({ ...value })),
        save: runSave,
        findOne: jest.fn(),
      } as unknown as Repository<BadgeRun>,
      {
        find: jest.fn(() => Promise.resolve(providers)),
        update: providerUpdate,
      } as unknown as Repository<Provider>,
      {
        count: jest.fn((options: { where: { providerId: string } }) =>
          Promise.resolve(unfinished[options.where.providerId] ?? 0),
        ),
      } as unknown as Repository<Contract>,
      { notifyLocalized: notify } as unknown as NotificationService,
      {
        autoDeleteForLowRating: autoDelete,
      } as unknown as ProviderService,
    );
  });

  describe('validate', () => {
    const base = () =>
      ENABLED_RULES.map((rule) => ({ ...rule })) as Parameters<
        BadgeService['validate']
      >[0];

    it('accepts non-overlapping enabled tiers', () => {
      expect(() => service.validate(base(), 'en')).not.toThrow();
    });

    it('requires both bounds on an enabled tier, but not on a disabled one', () => {
      const rules = base();
      rules[1].minBound = null;
      expect(() => service.validate(rules, 'en')).toThrow(
        'Please choose both the maximum and the minimum',
      );
      rules[1].enabled = false;
      expect(() => service.validate(rules, 'en')).not.toThrow();
    });

    it('rejects a min above the max', () => {
      const rules = base();
      rules[0].minBound = BadgeBound.EQ_5;
      rules[0].maxBound = BadgeBound.EQ_4;
      expect(() => service.validate(rules, 'en')).toThrow(
        'must not be higher than the maximum',
      );
    });

    it('rejects overlapping enabled tiers, in Arabic too', () => {
      const rules = base();
      rules[1].maxBound = BadgeBound.EQ_4;
      expect(() => service.validate(rules, 'en')).toThrow('must not overlap');
      expect(() => service.validate(rules, 'ar')).toThrow('يجب ألا تتداخل');
    });

    it('rejects "zero stars" as a maximum', () => {
      const rules = base();
      rules[2].maxBound = BadgeBound.ZERO;
      rules[2].enabled = false;
      expect(() => service.validate(rules, 'en')).toThrow('Zero stars');
    });
  });

  it('reports unset, disabled tiers when nothing is saved yet', async () => {
    settings = [];
    const result = await service.settings();
    expect(result.map((s) => [s.tier, s.enabled, s.maxBound])).toEqual([
      [BadgeTier.TRUST, false, null],
      [BadgeTier.DILIGENCE, false, null],
      [BadgeTier.UNDER_IMPROVEMENT, false, null],
    ]);
  });

  it('assigns tiers, skips unrated providers and notifies changes', async () => {
    providers = [
      provider({ id: 'trust', ratingAverage: 4.6, ratingCount: 3 }),
      provider({ id: 'diligent', ratingAverage: 3.5, ratingCount: 2 }),
      provider({ id: 'unrated', ratingAverage: 0, ratingCount: 0 }),
      provider({
        id: 'kept',
        ratingAverage: 4.2,
        ratingCount: 5,
        badge: BadgeTier.TRUST,
      }),
    ];

    const run = await service.runAssignment('2026-10', 'en');

    expect(run).toMatchObject({
      trustCount: 2,
      diligenceCount: 1,
      underImprovementCount: 0,
      changedCount: 2,
    });
    expect(providerUpdate).toHaveBeenCalledWith(
      'trust',
      expect.objectContaining({ badge: BadgeTier.TRUST }),
    );
    expect(providerUpdate).toHaveBeenCalledWith(
      'diligent',
      expect.objectContaining({ badge: BadgeTier.DILIGENCE }),
    );
    expect(providerUpdate).not.toHaveBeenCalledWith(
      'unrated',
      expect.anything(),
    );
    expect(providerUpdate).not.toHaveBeenCalledWith('kept', expect.anything());
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'trust',
        type: NotificationType.BADGE_CHANGED,
      }),
    );
  });

  it('stamps every evaluated provider so none stays "Newly Added"', async () => {
    providers = [
      provider({ id: 'unrated', ratingAverage: 0, ratingCount: 0 }),
      provider({
        id: 'kept',
        ratingAverage: 4.2,
        ratingCount: 5,
        badge: BadgeTier.TRUST,
      }),
    ];

    const run = await service.runAssignment('2026-10', 'en');

    const stamp = (providerUpdate.mock.calls as Array<[unknown, unknown]>).find(
      ([criteria]) => typeof criteria === 'object',
    );
    const [criteria, values] = stamp!;
    expect((criteria as { id: FindOperator<string[]> }).id.value).toEqual([
      'unrated',
      'kept',
    ]);
    expect(values).toEqual({ badgeEvaluatedAt: run.ranAt });
  });

  it('marks and warns a new Under-improvement provider without deleting', async () => {
    providers = [provider({ id: 'low', ratingAverage: 2.1, ratingCount: 4 })];

    await service.runAssignment('2026-10', 'en');

    expect(providerUpdate).toHaveBeenCalledWith(
      'low',
      expect.objectContaining({
        badge: BadgeTier.UNDER_IMPROVEMENT,
        underImprovementSince: expect.any(Date) as Date,
      }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'low',
        type: NotificationType.BADGE_WARNING,
        text: expect.objectContaining({
          en: expect.objectContaining({
            message: expect.stringContaining('to 3 stars or more') as string,
          }) as object,
        }) as object,
      }),
    );
    expect(autoDelete).not.toHaveBeenCalled();
  });

  it('deletes a provider still Under-improvement a month later', async () => {
    providers = [
      provider({
        id: 'still-low',
        ratingAverage: 2.4,
        ratingCount: 4,
        badge: BadgeTier.UNDER_IMPROVEMENT,
        underImprovementSince: new Date('2026-09-01T00:00:00Z'),
      }),
    ];

    const run = await service.runAssignment('2026-10', 'en');

    expect(autoDelete).toHaveBeenCalledWith(
      'still-low',
      expect.stringContaining('full month'),
    );
    expect(run.deletedProviders).toEqual([
      { id: 'still-low', name: 'Provider' },
    ]);
    expect(run.underImprovementCount).toBe(0);
  });

  it('skips deletion while the provider has unfinished contracts', async () => {
    providers = [
      provider({
        id: 'busy',
        ratingAverage: 2.4,
        ratingCount: 4,
        badge: BadgeTier.UNDER_IMPROVEMENT,
        underImprovementSince: new Date('2026-09-01T00:00:00Z'),
      }),
    ];
    unfinished.busy = 1;

    const run = await service.runAssignment('2026-10', 'en');

    expect(autoDelete).not.toHaveBeenCalled();
    expect(run.skippedProviders).toEqual([{ id: 'busy', name: 'Provider' }]);
    expect(run.underImprovementCount).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: NotificationType.BADGE_WARNING }),
    );
  });

  it('clears the Under-improvement streak once the rating recovers', async () => {
    providers = [
      provider({
        id: 'recovered',
        ratingAverage: 3.2,
        ratingCount: 6,
        badge: BadgeTier.UNDER_IMPROVEMENT,
        underImprovementSince: new Date('2026-09-01T00:00:00Z'),
      }),
    ];

    await service.runAssignment('2026-10', 'en');

    expect(autoDelete).not.toHaveBeenCalled();
    expect(providerUpdate).toHaveBeenCalledWith(
      'recovered',
      expect.objectContaining({
        badge: BadgeTier.DILIGENCE,
        underImprovementSince: null,
      }),
    );
  });

  it('runs at most once per month', async () => {
    await service.runAssignment('2026-10', 'en');
    await expect(service.runAssignment('2026-10', 'en')).rejects.toThrow(
      'already been assigned for this month',
    );
  });

  it('names the month in Riyadh time', () => {
    expect(badgePeriod(new Date('2026-10-31T21:30:00Z'))).toBe('2026-11');
    expect(badgePeriod(new Date('2026-10-31T20:59:00Z'))).toBe('2026-10');
  });
});
