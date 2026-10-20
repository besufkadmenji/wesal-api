import { Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { Listing } from '../listing/entities/listing.entity';
import { NotificationService } from '../notification/notification.service';
import { Provider } from '../provider/entities/provider.entity';
import { SearchService } from '../search/search.service';
import { SettingService } from '../setting/setting.service';
import { TrackingService } from '../tracking/tracking.service';
import { CategoryService } from './category.service';
import { CreateCategoryInput } from './dto/create-category.input';
import { Category } from './entities/category.entity';
import { CategoryStatus } from './enum/category.enum';
import {
  DEFAULT_REFUND_POLICY_AR,
  DEFAULT_UNDERTAKING_TEXT_EN,
  renderUndertaking,
} from './contract-text-defaults';

const base: CreateCategoryInput = {
  image: 'category.png',
  nameEn: 'Plumbing',
  nameAr: 'سباكة',
  descriptionEn: 'Plumbing services',
  descriptionAr: 'خدمات السباكة',
  rulesEn: 'Rules',
  rulesAr: 'شروط',
};

describe('CategoryService contract controls', () => {
  let saved: Partial<Category> | null;
  let providerCount: number;
  let linkedProviders: Array<{ id: string; languageCode: string }>;
  let openContracts: number;
  let notify: jest.Mock;
  let categoryFindOne: jest.Mock;
  let service: CategoryService;

  beforeEach(() => {
    saved = null;
    providerCount = 0;
    linkedProviders = [];
    openContracts = 0;
    notify = jest.fn(() => Promise.resolve());
    categoryFindOne = jest.fn();
    const providerQuery = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getCount: jest.fn(() => Promise.resolve(providerCount)),
      getMany: jest.fn(() => Promise.resolve(linkedProviders)),
    };
    service = new CategoryService(
      {
        create: jest.fn((value: Partial<Category>) => ({ ...value })),
        save: jest.fn((value: Partial<Category>) => {
          saved = value;
          return Promise.resolve({ id: 'category-id', ...value });
        }),
        findOne: categoryFindOne,
      } as unknown as Repository<Category>,
      {
        count: jest.fn(() => Promise.resolve(0)),
      } as unknown as Repository<Listing>,
      {
        createQueryBuilder: jest.fn(() => providerQuery),
      } as unknown as Repository<Provider>,
      {} as TrackingService,
      {
        indexCategory: jest.fn(() => Promise.resolve()),
        removeCategory: jest.fn(() => Promise.resolve()),
      } as unknown as SearchService,
      {
        count: jest.fn(() => Promise.resolve(openContracts)),
      } as unknown as Repository<Contract>,
      {
        getSetting: jest.fn(() =>
          Promise.resolve({
            defaultCommissionPercent: 2,
            defaultMinCommissionAmount: 10,
            defaultMaxExecutionHours: 72,
            defaultMaxTerminationHours: 120,
            defaultDepositPercent: 10,
            defaultCustomerConversationFee: 5,
            defaultProviderConversationFee: 7,
          }),
        ),
      } as unknown as SettingService,
      { notifyLocalized: notify } as unknown as NotificationService,
    );
  });

  it('fills missing values from Settings and empty texts from the BRD defaults', async () => {
    await service.create({ ...base, depositPercent: 20 }, 'en');

    expect(saved).toMatchObject({
      commissionPercent: 2,
      minCommissionAmount: 10,
      maxExecutionHours: 72,
      maxTerminationHours: 120,
      depositPercent: 20,
      customerConversationFee: 5,
      providerConversationFee: 7,
      undertakingTextEn: DEFAULT_UNDERTAKING_TEXT_EN,
      refundPolicyAr: DEFAULT_REFUND_POLICY_AR,
    });
    expect(saved?.contractDocumentText).toContain('payment gateway');
  });

  it('rejects an enabled value that is missing or below 1', async () => {
    await expect(
      service.create(
        { ...base, commissionEnabled: true, commissionPercent: 0 },
        'en',
      ),
    ).rejects.toThrow('whole-number value');
    // The minimum commission may be 0 when enabled.
    await expect(
      service.create(
        { ...base, minCommissionEnabled: true, minCommissionAmount: 0 },
        'en',
      ),
    ).resolves.toBeDefined();
  });

  it('rejects an enabled text left empty on update', async () => {
    categoryFindOne.mockResolvedValue({ id: 'category-id', ...base });
    await expect(
      service.update(
        {
          id: 'category-id',
          undertakingEnabled: true,
          undertakingTextAr: '  ',
          undertakingTextEn: 'Text',
        },
        'ar',
      ),
    ).rejects.toThrow('يجب تعبئة جميع نصوص التعاقد المفعّلة');
  });

  it('blocks deactivation only while contracts are unfinished (S4-56)', async () => {
    categoryFindOne.mockResolvedValue({
      id: 'category-id',
      nameEn: 'Plumbing',
      nameAr: 'سباكة',
      status: CategoryStatus.ACTIVE,
    });
    openContracts = 2;
    await expect(service.deactivate('category-id', 'en')).rejects.toThrow(
      'unfinished contracts',
    );

    // Linked providers no longer block it; they are told instead.
    openContracts = 0;
    providerCount = 1;
    linkedProviders = [{ id: 'p-en', languageCode: 'en' }];
    await expect(
      service.deactivate('category-id', 'en'),
    ).resolves.toMatchObject({ status: CategoryStatus.INACTIVE });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'p-en' }),
    );
  });

  it('notifies linked providers in their language when the status changes', async () => {
    categoryFindOne.mockResolvedValue({
      id: 'category-id',
      nameEn: 'Plumbing',
      nameAr: 'سباكة',
      status: CategoryStatus.INACTIVE,
    });
    linkedProviders = [
      { id: 'p-en', languageCode: 'en' },
      { id: 'p-ar', languageCode: 'ar' },
    ];

    await service.activate('category-id', 'en');

    // Both languages are stored; each reader gets their own (D-11).
    for (const recipientId of ['p-en', 'p-ar']) {
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId,
          text: {
            ar: expect.objectContaining({
              message: 'تم تفعيل القسم "سباكة".',
            }) as object,
            en: expect.objectContaining({
              message: 'The category "Plumbing" has been activated.',
            }) as object,
          },
        }),
      );
    }
  });

  it('fills the undertaking placeholders with the contract terms', () => {
    expect(renderUndertaking(DEFAULT_UNDERTAKING_TEXT_EN, 2, 10)).toBe(
      'I agree that the platform commission (2%) is calculated on the contract value, and that commissions equal to or below SAR 10 are given as charity through Wesal Al-Khair.',
    );
  });
});
