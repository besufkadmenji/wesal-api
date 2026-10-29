import { ProviderService } from './provider.service';

/** ClickUp 869fn0tyd: deleted providers showed on the list (28 vs 25). */
describe('ProviderService list', () => {
  it('leaves deleted providers out', async () => {
    const conditions: string[] = [];
    const qb = {
      leftJoinAndSelect: () => qb,
      where: (sql: string) => (conditions.push(sql), qb),
      andWhere: (sql: string) => (conditions.push(sql), qb),
      orderBy: () => qb,
      skip: () => qb,
      take: () => qb,
      getCount: () => Promise.resolve(0),
      getMany: () => Promise.resolve([]),
    };
    const service = new ProviderService(
      { createQueryBuilder: () => qb } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.findAll({ page: 1, limit: 10 });

    expect(conditions).toContain('provider.deletedAt IS NULL');
  });
});
