import { DataSource } from 'typeorm';
import { AdminPermissionType } from '../admin/enums/admin-permission-type.enum';
import { ComplaintStatus } from '../complaint/enums/complaint-status.enum';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { PaymentPurpose } from '../payment/enums/payment-purpose.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { DashboardInsightsService } from './dashboard-insights.service';
import { DashboardRange } from './dto/dashboard-range.enum';
import { STATISTICS_TIME_ZONE } from './statistics.constants';

describe('DashboardInsightsService', () => {
  let query: jest.Mock;
  let permissionCount: jest.Mock;
  let service: DashboardInsightsService;

  beforeEach(() => {
    query = jest.fn();
    permissionCount = jest.fn().mockResolvedValue(0);
    const builder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: permissionCount,
    };
    const dataSource = {
      query,
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => builder),
      })),
    } as unknown as DataSource;
    service = new DashboardInsightsService(dataSource);
  });

  it.each([
    [DashboardRange.LAST_7_DAYS, 'day', 7],
    [DashboardRange.LAST_30_DAYS, 'day', 30],
    [DashboardRange.LAST_12_MONTHS, 'month', 12],
  ])('buckets %s by %s in Riyadh time', async (range, unit, buckets) => {
    query.mockResolvedValue([]);
    await service.growthSeries(range);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('generate_series');
    expect(params).toEqual([unit, STATISTICS_TIME_ZONE, buckets]);
  });

  it('splits revenue by purpose and converts decimals to numbers', async () => {
    query.mockResolvedValue([
      { bucket: '2026-10-19', contracts: '0', chatFees: '0', premiumAds: '0' },
      {
        bucket: '2026-10-20',
        contracts: '12.50',
        chatFees: '10.00',
        premiumAds: '49.99',
      },
    ]);
    const points = await service.revenueSeries(DashboardRange.LAST_7_DAYS);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params.slice(3)).toEqual([
      PaymentStatus.COMPLETED,
      PaymentPurpose.CONTRACT,
      PaymentPurpose.CHAT_CUSTOMER,
      PaymentPurpose.CHAT_PROVIDER,
      PaymentPurpose.PREMIUM_AD,
    ]);
    // Contract revenue is the platform commission, never charity.
    expect(sql).toContain('"commissionAmount"');
    expect(sql).toContain('"isCharity"');
    expect(points).toEqual([
      { bucket: '2026-10-19', contracts: 0, chatFees: 0, premiumAds: 0 },
      {
        bucket: '2026-10-20',
        contracts: 12.5,
        chatFees: 10,
        premiumAds: 49.99,
      },
    ]);
  });

  it('excludes drafts from the status breakdown and top categories', async () => {
    query.mockResolvedValue([{ status: ContractStatus.COMPLETED, count: '3' }]);
    await expect(
      service.contractStatusBreakdown(DashboardRange.LAST_30_DAYS),
    ).resolves.toEqual([{ status: ContractStatus.COMPLETED, count: 3 }]);
    const calls = query.mock.calls as Array<[string, unknown[]]>;
    expect(calls[0][1]).toContain(ContractStatus.DRAFT);

    query.mockResolvedValue([
      { categoryId: 'c1', nameAr: 'سباكة', nameEn: 'Plumbing', contracts: '9' },
    ]);
    await expect(
      service.topCategories(DashboardRange.LAST_30_DAYS),
    ).resolves.toEqual([
      { categoryId: 'c1', nameAr: 'سباكة', nameEn: 'Plumbing', contracts: 9 },
    ]);
    expect(calls[1][0]).toContain('LIMIT 6');
  });

  it('counts every attention item for a super admin', async () => {
    query.mockImplementation((_sql: string, params: unknown[]) =>
      Promise.resolve([
        {
          count:
            params[0] === ProviderStatus.PENDING_APPROVAL
              ? '4'
              : params[0] === ComplaintStatus.PENDING
                ? '2'
                : params[0] === ContractStatus.DISPUTED
                  ? '1'
                  : '0',
        },
      ]),
    );
    await expect(
      service.attentionCounts({
        sub: 'a1',
        email: 'a@x',
        permissionType: AdminPermissionType.SUPER_ADMIN,
      }),
    ).resolves.toEqual({
      pendingProviderRequests: 4,
      openComplaints: 2,
      cancellationRequests: 0,
      disputedContracts: 1,
      terminationRequests: 0,
    });
    expect(permissionCount).not.toHaveBeenCalled();
  });

  it('returns null for modules a custom admin cannot read', async () => {
    // provider: no, complaint: yes, contract: no
    permissionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    query.mockResolvedValue([{ count: '5' }]);
    await expect(
      service.attentionCounts({
        sub: 'a2',
        email: 'b@x',
        permissionType: AdminPermissionType.CUSTOM,
      }),
    ).resolves.toEqual({
      pendingProviderRequests: null,
      openComplaints: 5,
      cancellationRequests: null,
      disputedContracts: null,
      terminationRequests: null,
    });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
