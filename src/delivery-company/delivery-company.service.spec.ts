import { DeliveryCompanyService } from './delivery-company.service';
import { DeliveryCompanyStatus } from './enums/delivery-company-status.enum';

describe('DeliveryCompanyService', () => {
  const repository = {
    find: jest.fn(),
  };
  const service = new DeliveryCompanyService(repository as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns only active delivery companies for participant forms', async () => {
    const companies = [
      {
        id: '69d4b112-78e8-41a8-bf19-a51e040455dc',
        nameEn: 'Fast Delivery',
        nameAr: 'التوصيل السريع',
        status: DeliveryCompanyStatus.ACTIVE,
      },
    ];
    repository.find.mockResolvedValue(companies);

    await expect(service.findActive()).resolves.toEqual(companies);
    expect(repository.find).toHaveBeenCalledWith({
      where: { status: DeliveryCompanyStatus.ACTIVE },
      order: { nameEn: 'ASC' },
    });
  });
});
