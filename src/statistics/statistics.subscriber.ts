import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityMetadata,
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  RecoverEvent,
  RemoveEvent,
  SoftRemoveEvent,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  UpdateEvent,
} from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { Message } from '../conversation/entities/message.entity';
import { Listing } from '../listing/entities/listing.entity';
import { Provider } from '../provider/entities/provider.entity';
import { User } from '../user/entities/user.entity';
import { StatisticsService } from './statistics.service';

/** Entities whose writes can change a statistic. */
const TRACKED_ENTITIES = new Set<unknown>([
  User,
  Provider,
  Contract,
  Message,
  Listing,
]);

/**
 * Marks the statistics dirty after any ORM write (save, update, delete,
 * soft delete) to a tracked entity. Writes inside a transaction wait for the
 * commit, so the recount never reads uncommitted or rolled-back data.
 */
@Injectable()
export class StatisticsSubscriber implements EntitySubscriberInterface {
  /**
   * Open transactions with a tracked write. Kept here rather than in
   * `queryRunner.data`, which TypeORM's save() swaps out and restores.
   */
  private readonly pending = new WeakSet<QueryRunner>();

  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly statisticsService: StatisticsService,
  ) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<unknown>): void {
    this.touch(event.metadata, event.queryRunner);
  }

  afterUpdate(event: UpdateEvent<unknown>): void {
    this.touch(event.metadata, event.queryRunner);
  }

  afterRemove(event: RemoveEvent<unknown>): void {
    this.touch(event.metadata, event.queryRunner);
  }

  afterSoftRemove(event: SoftRemoveEvent<unknown>): void {
    this.touch(event.metadata, event.queryRunner);
  }

  afterRecover(event: RecoverEvent<unknown>): void {
    this.touch(event.metadata, event.queryRunner);
  }

  afterTransactionCommit(event: TransactionCommitEvent): void {
    // A commit of a nested savepoint leaves the outer transaction open.
    if (event.queryRunner.isTransactionActive) return;
    if (!this.pending.delete(event.queryRunner)) return;
    this.statisticsService.markDirty();
  }

  afterTransactionRollback(event: TransactionRollbackEvent): void {
    if (event.queryRunner.isTransactionActive) return;
    this.pending.delete(event.queryRunner);
  }

  private touch(metadata: EntityMetadata, queryRunner: QueryRunner): void {
    if (!TRACKED_ENTITIES.has(metadata.target)) return;
    if (queryRunner.isTransactionActive) {
      this.pending.add(queryRunner);
      return;
    }
    this.statisticsService.markDirty();
  }
}
