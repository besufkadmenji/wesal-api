import { Repository } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { SettingService } from '../setting/setting.service';
import { ContractInvoiceService } from './contract-invoice.service';
import { Contract } from './entities/contract.entity';
import { ContractStatus } from './enums/contract-status.enum';

const contract = (overrides: Partial<Contract> = {}) =>
  ({
    id: 'contract-id',
    publicId: 1184,
    status: ContractStatus.COMPLETED,
    categoryId: 'category-id',
    agreedPrice: 300,
    vatRate: 15,
    vatAmount: 45,
    totalPayable: 345,
    paidAt: new Date('2026-10-15T11:33:00Z'),
    customerAddress: 'Riyadh',
    client: { name: 'Local Customer', phone: '511110001', dialCode: '+966' },
    provider: { commercialName: 'Local Plumbing Co' },
    conversation: { listing: { name: 'Emergency plumbing repair' } },
    ...overrides,
  }) as unknown as Contract;

const service = (value: Contract | null) =>
  new ContractInvoiceService(
    {
      findOne: jest.fn(() => Promise.resolve(value)),
    } as unknown as Repository<Contract>,
    {
      findOne: jest.fn(() =>
        Promise.resolve({ nameEn: 'Plumbing', nameAr: 'سباكة' }),
      ),
    } as unknown as Repository<Category>,
    {
      getSetting: jest.fn(() =>
        Promise.resolve({
          sellerLegalNameEn: 'Wesal Co.',
          sellerVatNumber: '300000000000003',
          phones: [],
        }),
      ),
    } as unknown as SettingService,
  );

describe('ContractInvoiceService', () => {
  it('numbers invoices after the contract', () => {
    expect(ContractInvoiceService.invoiceNumber(contract())).toBe('INV-1184');
  });

  it('refuses an unpaid contract with a localized message', async () => {
    await expect(
      service(contract({ paidAt: null })).render('contract-id', 'ar'),
    ).rejects.toThrow('تتوفر الفاتورة بعد سداد قيمة التعاقد');
  });

  it('renders a PDF for a paid contract in both languages', async () => {
    for (const language of ['en', 'ar'] as const) {
      const { buffer, number } = await service(contract()).render(
        'contract-id',
        language,
      );
      expect(number).toBe('INV-1184');
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    }
  });
});
