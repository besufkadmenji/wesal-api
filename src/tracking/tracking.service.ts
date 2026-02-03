import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackActionInput } from './dto/track-action.input';
import { Tracking } from './entities/tracking.entity';
import { ActionType } from './enums/action-type.enum';
import { TargetType } from './enums/target-type.enum';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(Tracking)
    private readonly trackingRepository: Repository<Tracking>,
  ) {}

  /**
   * Track a user action (view or click) on a category or listing
   */
  async trackAction(
    userId: string,
    input: TrackActionInput,
  ): Promise<Tracking> {
    const tracking = this.trackingRepository.create({
      userId,
      targetType: input.targetType,
      targetId: input.targetId,
      actionType: input.actionType,
    });

    return this.trackingRepository.save(tracking);
  }

  /**
   * Get most popular categories based on views/clicks for a user
   * Returns category IDs sorted by popularity
   */
  async getPopularCategories(
    userId: string,
    limit = 10,
  ): Promise<{ categoryId: string; count: number }[]> {
    const result = await this.trackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.targetId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('tracking.userId = :userId', { userId })
      .andWhere('tracking.targetType = :targetType', {
        targetType: TargetType.CATEGORY,
      })
      .groupBy('tracking.targetId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ categoryId: string; count: string }>();

    return result.map((r) => ({
      categoryId: r.categoryId,
      count: parseInt(r.count),
    }));
  }

  /**
   * Get most popular listings based on views/clicks for a user
   * Returns listing IDs sorted by popularity
   */
  async getPopularListings(
    userId: string,
    limit = 10,
  ): Promise<{ listingId: string; count: number }[]> {
    const result = await this.trackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.targetId', 'listingId')
      .addSelect('COUNT(*)', 'count')
      .where('tracking.userId = :userId', { userId })
      .andWhere('tracking.targetType = :targetType', {
        targetType: TargetType.LISTING,
      })
      .groupBy('tracking.targetId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ listingId: string; count: string }>();

    return result.map((r) => ({
      listingId: r.listingId,
      count: parseInt(r.count),
    }));
  }

  /**
   * Get global popular categories (all users)
   * Useful for anonymous users or recommendations
   */
  async getGlobalPopularCategories(
    limit = 10,
    actionType?: ActionType,
  ): Promise<{ categoryId: string; count: number }[]> {
    const query = this.trackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.targetId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('tracking.targetType = :targetType', {
        targetType: TargetType.CATEGORY,
      });

    if (actionType) {
      query.andWhere('tracking.actionType = :actionType', { actionType });
    }

    const result = await query
      .groupBy('tracking.targetId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ categoryId: string; count: string }>();

    return result.map((r) => ({
      categoryId: r.categoryId,
      count: parseInt(r.count),
    }));
  }

  /**
   * Get global popular listings (all users)
   * Useful for anonymous users or recommendations
   */
  async getGlobalPopularListings(
    limit = 10,
    actionType?: ActionType,
  ): Promise<{ listingId: string; count: number }[]> {
    const query = this.trackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.targetId', 'listingId')
      .addSelect('COUNT(*)', 'count')
      .where('tracking.targetType = :targetType', {
        targetType: TargetType.LISTING,
      });

    if (actionType) {
      query.andWhere('tracking.actionType = :actionType', { actionType });
    }

    const result = await query
      .groupBy('tracking.targetId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ listingId: string; count: string }>();

    return result.map((r) => ({
      listingId: r.listingId,
      count: parseInt(r.count),
    }));
  }

  /**
   * Get tracking stats for a specific target
   */
  async getTargetStats(
    targetType: TargetType,
    targetId: string,
  ): Promise<{
    views: number;
    clicks: number;
    uniqueUsers: number;
  }> {
    const [views, clicks, uniqueUsers] = await Promise.all([
      this.trackingRepository.count({
        where: {
          targetType,
          targetId,
          actionType: ActionType.VIEW,
        },
      }),
      this.trackingRepository.count({
        where: {
          targetType,
          targetId,
          actionType: ActionType.CLICK,
        },
      }),
      this.trackingRepository
        .createQueryBuilder('tracking')
        .select('COUNT(DISTINCT tracking.userId)', 'count')
        .where('tracking.targetType = :targetType', { targetType })
        .andWhere('tracking.targetId = :targetId', { targetId })
        .getRawOne<{ count: string }>()
        .then((r) => parseInt(r?.count ?? '0')),
    ]);

    return { views, clicks, uniqueUsers };
  }
}
