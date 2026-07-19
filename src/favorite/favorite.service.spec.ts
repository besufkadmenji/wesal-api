/* eslint-disable @typescript-eslint/no-unsafe-return */
import { FavoriteService } from './favorite.service';

describe('FavoriteService', () => {
  const favoriteRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
    remove: jest.fn((value) => Promise.resolve(value)),
    findAndCount: jest.fn(),
    count: jest.fn(),
  };
  const userRepository = { findOne: jest.fn() };
  const providerRepository = { findOne: jest.fn() };
  const service = new FavoriteService(
    favoriteRepository as never,
    userRepository as never,
    providerRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findOne.mockResolvedValue({ id: 'customer-id' });
    providerRepository.findOne.mockResolvedValue({ id: 'provider-id' });
  });

  it('stores one token-derived customer/provider favorite idempotently', async () => {
    favoriteRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'favorite-id',
        userId: 'customer-id',
        providerId: 'provider-id',
      });

    await service.setProviderFavorite('customer-id', 'provider-id', true);
    await service.setProviderFavorite('customer-id', 'provider-id', true);

    expect(favoriteRepository.save).toHaveBeenCalledTimes(1);
    expect(favoriteRepository.create).toHaveBeenCalledWith({
      userId: 'customer-id',
      providerId: 'provider-id',
    });
  });

  it('always scopes favorite reads to the authenticated customer', async () => {
    favoriteRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll('customer-id', { page: 1, limit: 10 });

    expect(favoriteRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'customer-id' } }),
    );
  });
});
