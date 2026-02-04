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
   * Get all tracking records
   */
  async findAll(): Promise<Tracking[]> {
    return this.trackingRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Track a user action (view or click) on a category or listing
   * Uses upsert to increment count instead of creating duplicate rows
   */
  async trackAction(
    userId: string,
    input: TrackActionInput,
  ): Promise<Tracking> {
    // Try to find existing tracking record
    const existing = await this.trackingRepository.findOne({
      where: {
        userId,
        targetType: input.targetType,
        targetId: input.targetId,
        actionType: input.actionType,
      },
    });

    if (existing) {
      // Increment count and update timestamp
      existing.count += 1;
      return this.trackingRepository.save(existing);
    }

    // Create new tracking record
    const tracking = this.trackingRepository.create({
      userId,
      targetType: input.targetType,
      targetId: input.targetId,
      actionType: input.actionType,
      count: 1,
    });

    return this.trackingRepository.save(tracking);
  }

  /**
   * Get most popular categories based on clicks for a user
   * Returns category IDs sorted by popularity (count)
   */
  async getPopularCategories(
    userId: string,
    limit = 10,
  ): Promise<{ categoryId: string; count: number }[]> {
    const result = await this.trackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.targetId', 'categoryId')
      .addSelect('SUM(tracking.count)', 'count')
      .where('tracking.userId = :userId', { userId })
      .andWhere('tracking.targetType = :targetType', {
        targetType: TargetType.CATEGORY,
      })
      .andWhere('tracking.actionType = :actionType', {
        actionType: ActionType.CLICK,
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
   * Get most popular listings based on clicks for a user
   * Returns listing IDs sorted by popularity (count)
   */
  async getPopularListings(
    userId: string,
    limit = 10,
  ): Promise<{ listingId: string; count: number }[]> {
    const result = await this.trackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.targetId', 'listingId')
      .addSelect('SUM(tracking.count)', 'count')
      .where('tracking.userId = :userId', { userId })
      .andWhere('tracking.targetType = :targetType', {
        targetType: TargetType.LISTING,
      })
      .andWhere('tracking.actionType = :actionType', {
        actionType: ActionType.CLICK,
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
      .addSelect('SUM(tracking.count)', 'count')
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
      .addSelect('SUM(tracking.count)', 'count')
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
    const [viewsResult, clicksResult, uniqueUsers] = await Promise.all([
      this.trackingRepository
        .createQueryBuilder('tracking')
        .select('SUM(tracking.count)', 'total')
        .where('tracking.targetType = :targetType', { targetType })
        .andWhere('tracking.targetId = :targetId', { targetId })
        .andWhere('tracking.actionType = :actionType', {
          actionType: ActionType.VIEW,
        })
        .getRawOne<{ total: string }>(),
      this.trackingRepository
        .createQueryBuilder('tracking')
        .select('SUM(tracking.count)', 'total')
        .where('tracking.targetType = :targetType', { targetType })
        .andWhere('tracking.targetId = :targetId', { targetId })
        .andWhere('tracking.actionType = :actionType', {
          actionType: ActionType.CLICK,
        })
        .getRawOne<{ total: string }>(),
      this.trackingRepository
        .createQueryBuilder('tracking')
        .select('COUNT(DISTINCT tracking.userId)', 'count')
        .where('tracking.targetType = :targetType', { targetType })
        .andWhere('tracking.targetId = :targetId', { targetId })
        .getRawOne<{ count: string }>()
        .then((r) => parseInt(r?.count ?? '0')),
    ]);

    return {
      views: parseInt(viewsResult?.total ?? '0'),
      clicks: parseInt(clicksResult?.total ?? '0'),
      uniqueUsers,
    };
  }
}
