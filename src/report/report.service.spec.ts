import { ReportService } from './report.service';

describe('ReportService', () => {
  function queryBuilder() {
    return {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawOne: jest
        .fn()
        .mockResolvedValue({ count: '1', customer: '12.5', provider: '20' }),
      getRawMany: jest.fn().mockResolvedValue([
        {
          conversationId: 'conversation-id',
          conversationNumber: '42',
          status: 'ACTIVE',
          customerName: 'Customer',
          providerName: 'Provider',
          providerPhone: '+966500000000',
          startedAt: '2026-07-19T00:00:00Z',
          endedAt: null,
          customerFee: '12.5',
          providerFee: '20',
        },
      ]),
    };
  }

  it('returns separate customer and provider conversation-fee totals', async () => {
    const builder = queryBuilder();
    const service = new ReportService({
      createQueryBuilder: jest.fn(() => builder),
    } as never);

    const report = await service.conversationFees({});

    expect(report).toMatchObject({
      totalCustomerFees: 12.5,
      totalProviderFees: 20,
      meta: { total: 1, page: 1, limit: 10 },
    });
    expect(report.items[0]).toMatchObject({
      customerFee: 12.5,
      providerFee: 20,
    });
  });

  it('emits valid PDF and XLSX signatures', async () => {
    const service = new ReportService({} as never);
    jest.spyOn(service, 'conversationFees').mockResolvedValue({
      items: [],
      meta: { total: 0, page: 1, limit: 100000 },
      totalCustomerFees: 0,
      totalProviderFees: 0,
    });

    const [pdf, xlsx] = await Promise.all([
      service.exportConversationFees({}, 'pdf'),
      service.exportConversationFees({}, 'xlsx'),
    ]);

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(xlsx.subarray(0, 2).toString()).toBe('PK');
  });
});
