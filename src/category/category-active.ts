import type { EntityManager, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CategoryStatus } from './enum/category.enum';

/**
 * S4-56 (user decision 2026-10-20): an inactive category hides its listings
 * from the public and blocks new listings, chats, contracts and featured-ad
 * payments; work already under way may finish.
 */
export async function isCategoryActive(
  source: EntityManager | Repository<Category>,
  categoryId: string | null | undefined,
): Promise<boolean> {
  if (!categoryId) return true;
  const repository =
    'getRepository' in source ? source.getRepository(Category) : source;
  const category = await repository.findOne({
    where: { id: categoryId },
    select: { id: true, status: true },
  });
  return !category || category.status !== CategoryStatus.INACTIVE;
}

/** SQL condition keeping rows whose joined category (by alias) is active. */
export const activeCategoryCondition = (alias: string) =>
  `${alias}.status = '${CategoryStatus.ACTIVE}'`;
