import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nNotFoundException } from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { FavoritePaginationInput } from './dto/favorite-pagination.input';
import { Favorite } from './entities/favorite.entity';
import { User } from '../user/entities/user.entity';
import { Provider } from '../provider/entities/provider.entity';
import { FAVORITE_ERROR_MESSAGES } from './errors/favorite.error-messages';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
  ) {}

  async setProviderFavorite(
    userId: string,
    providerId: string,
    favorite: boolean,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    const [user, provider] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.providerRepository.findOne({ where: { id: providerId } }),
    ]);
    if (!user) throw this.notFound('USER_NOT_FOUND', language);
    if (!provider) throw this.notFound('PROVIDER_NOT_FOUND', language);

    const existing = await this.favoriteRepository.findOne({
      where: { userId, providerId },
    });
    if (favorite && !existing) {
      await this.favoriteRepository.save(
        this.favoriteRepository.create({ userId, providerId }),
      );
    } else if (!favorite && existing) {
      await this.favoriteRepository.remove(existing);
    }
    return favorite;
  }

  async findAll(
    userId: string,
    input: FavoritePaginationInput,
  ): Promise<IPaginatedType<Favorite>> {
    const { page = 1, limit = 10, sortBy, sortOrder = SortOrder.DESC } = input;
    const [items, total] = await this.favoriteRepository.findAndCount({
      where: { userId },
      relations: ['provider'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        [sortBy ?? 'createdAt']: sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
      },
    });
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

  async isFavorite(userId: string, providerId: string): Promise<boolean> {
    return (
      (await this.favoriteRepository.count({ where: { userId, providerId } })) >
      0
    );
  }

  private notFound(
    code: 'USER_NOT_FOUND' | 'PROVIDER_NOT_FOUND',
    language: LanguageCode,
  ): I18nNotFoundException {
    const message = I18nService.translate(
      FAVORITE_ERROR_MESSAGES[code],
      language,
    );
    return new I18nNotFoundException({ en: message, ar: message }, language);
  }
}
