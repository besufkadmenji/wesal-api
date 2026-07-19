import { ReportService } from './report.service';
import { PaymentPurpose } from '../payment/enums/payment-purpose.enum';

describe('ReportService', () => {
  function queryBuilder(payments: unknown[], total: number) {
    const totals = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest
        .fn()
        .mockResolvedValue({ customer: '12.5', provider: '20' }),
    };
    return {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      clone: jest.fn(() => totals),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([payments, total]),
    };
  }

  it('returns separate customer and provider conversation-fee totals', async () => {
    const createdAt = new Date('2026-07-19T00:00:00Z');
    const builder = queryBuilder(
      [
        {
          id: 'customer-payment',
          purpose: PaymentPurpose.CHAT_CUSTOMER,
          amount: 12.5,
          conversationId: 'conversation-id',
          conversation: { id: 'conversation-id', status: 'ACTIVE' },
          createdAt,
        },
        {
          id: 'provider-payment',
          purpose: PaymentPurpose.CHAT_PROVIDER,
          amount: 20,
          conversationId: 'conversation-id',
          conversation: { id: 'conversation-id', status: 'ACTIVE' },
          createdAt,
        },
      ],
      2,
    );
    const service = new ReportService({
      createQueryBuilder: jest.fn(() => builder),
    } as never);

    const report = await service.conversationFees({});

    expect(report).toMatchObject({
      totalCustomerFees: 12.5,
      totalProviderFees: 20,
      meta: { total: 2, page: 1, limit: 10 },
    });
    expect(report.items[0]).toMatchObject({
      customerFee: 12.5,
      providerFee: 0,
    });
    expect(report.items[1]).toMatchObject({
      customerFee: 0,
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
