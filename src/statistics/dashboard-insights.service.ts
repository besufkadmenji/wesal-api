import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminPermission } from '../admin-permission/entities/admin-permission.entity';
import { AdminPermissionType } from '../admin/enums/admin-permission-type.enum';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { ComplaintStatus } from '../complaint/enums/complaint-status.enum';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { PaymentPurpose } from '../payment/enums/payment-purpose.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { PermissionPlatform } from '../permission/enums/permission-platform.enum';
import { SignedContractStatus } from '../provider/enums/contract.enum';
import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { DashboardRange } from './dto/dashboard-range.enum';
import {
  DashboardAttentionCounts,
  DashboardContractStatusCount,
  DashboardGrowthPoint,
  DashboardRevenuePoint,
  DashboardTopCategory,
} from './dto/dashboard-insights.response';
import { STATISTICS_TIME_ZONE } from './statistics.constants';

type Window = { unit: 'day' | 'month'; buckets: number };

export const RANGE_WINDOWS: Record<DashboardRange, Window> = {
  [DashboardRange.LAST_7_DAYS]: { unit: 'day', buckets: 7 },
  [DashboardRange.LAST_30_DAYS]: { unit: 'day', buckets: 30 },
  [DashboardRange.LAST_12_MONTHS]: { unit: 'month', buckets: 12 },
};

/** Same bypass as AdminPermissionGuard. */
const BYPASS_ROLES = new Set<AdminPermissionType>([
  AdminPermissionType.SUPER_ADMIN,
  AdminPermissionType.ADMINISTRATOR,
]);

/** Riyadh-local bucket starts, oldest first: $1 unit, $2 zone, $3 count. */
const BUCKETS_CTE = `
  WITH buckets AS (
    SELECT generate_series(
      date_trunc($1, now() AT TIME ZONE $2) - ($3::int - 1) * ('1 ' || $1)::interval,
      date_trunc($1, now() AT TIME ZONE $2),
      ('1 ' || $1)::interval
    ) AS bucket
  )`;

/** Start of the first bucket as an instant: $1 unit, $2 zone, $3 count. */
const WINDOW_START = `((date_trunc($1, now() AT TIME ZONE $2) - ($3::int - 1) * ('1 ' || $1)::interval) AT TIME ZONE $2)`;

/**
 * UI-14 (user, 2026-10-20): admin dashboard charts and the "needs attention"
 * panel. Read-only aggregates; not part of the live BRD 4.3.3 cards.
 */
@Injectable()
export class DashboardInsightsService {
  constructor(private readonly dataSource: DataSource) {}

  async revenueSeries(range: DashboardRange): Promise<DashboardRevenuePoint[]> {
    const rows = await this.dataSource.query<
      Array<Record<'bucket' | 'contracts' | 'chatFees' | 'premiumAds', string>>
    >(
      `${BUCKETS_CTE}
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS "bucket",
        COALESCE(SUM(CASE WHEN p."purpose" = $5 AND NOT COALESCE(c."isCharity", false)
          THEN p."commissionAmount" ELSE 0 END), 0) AS "contracts",
        COALESCE(SUM(CASE WHEN p."purpose" IN ($6, $7) THEN p."amount" ELSE 0 END), 0) AS "chatFees",
        COALESCE(SUM(CASE WHEN p."purpose" = $8 THEN p."amount" ELSE 0 END), 0) AS "premiumAds"
      FROM buckets b
      LEFT JOIN "payments" p
        ON p."status" = $4
       AND p."paidAt" IS NOT NULL
       AND date_trunc($1, p."paidAt" AT TIME ZONE $2) = b.bucket
      LEFT JOIN "contracts" c ON c."id" = p."contractId"
      GROUP BY b.bucket
      ORDER BY b.bucket`,
      [
        ...this.windowParams(range),
        PaymentStatus.COMPLETED,
        PaymentPurpose.CONTRACT,
        PaymentPurpose.CHAT_CUSTOMER,
        PaymentPurpose.CHAT_PROVIDER,
        PaymentPurpose.PREMIUM_AD,
      ],
    );
    return rows.map((row) => ({
      bucket: row.bucket,
      contracts: Number(row.contracts),
      chatFees: Number(row.chatFees),
      premiumAds: Number(row.premiumAds),
    }));
  }

  async growthSeries(range: DashboardRange): Promise<DashboardGrowthPoint[]> {
    const rows = await this.dataSource.query<
      Array<Record<'bucket' | 'customers' | 'providers', string>>
    >(
      `${BUCKETS_CTE}
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS "bucket",
        (SELECT COUNT(*) FROM "users" u
          WHERE u."deletedAt" IS NULL
            AND date_trunc($1, u."createdAt" AT TIME ZONE $2) = b.bucket) AS "customers",
        (SELECT COUNT(*) FROM "providers" pr
          WHERE pr."deletedAt" IS NULL
            AND date_trunc($1, pr."createdAt" AT TIME ZONE $2) = b.bucket) AS "providers"
      FROM buckets b
      ORDER BY b.bucket`,
      this.windowParams(range),
    );
    return rows.map((row) => ({
      bucket: row.bucket,
      customers: Number(row.customers),
      providers: Number(row.providers),
    }));
  }

  async contractStatusBreakdown(
    range: DashboardRange,
  ): Promise<DashboardContractStatusCount[]> {
    const rows = await this.dataSource.query<
      Array<{ status: ContractStatus; count: string }>
    >(
      `SELECT c."status" AS "status", COUNT(*) AS "count"
      FROM "contracts" c
      WHERE c."status" <> $4 AND c."createdAt" >= ${WINDOW_START}
      GROUP BY c."status"
      ORDER BY COUNT(*) DESC`,
      [...this.windowParams(range), ContractStatus.DRAFT],
    );
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
  }

  async topCategories(range: DashboardRange): Promise<DashboardTopCategory[]> {
    const rows = await this.dataSource.query<
      Array<Record<'categoryId' | 'nameAr' | 'nameEn' | 'contracts', string>>
    >(
      `SELECT cat."id" AS "categoryId", cat."nameAr" AS "nameAr",
        cat."nameEn" AS "nameEn", COUNT(c."id") AS "contracts"
      FROM "contracts" c
      JOIN "categories" cat ON cat."id" = c."categoryId"
      WHERE c."status" <> $4 AND c."createdAt" >= ${WINDOW_START}
      GROUP BY cat."id"
      ORDER BY COUNT(c."id") DESC, cat."nameEn" ASC
      LIMIT 6`,
      [...this.windowParams(range), ContractStatus.DRAFT],
    );
    return rows.map((row) => ({
      categoryId: row.categoryId,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      contracts: Number(row.contracts),
    }));
  }

  async attentionCounts(
    admin: AdminJwtPayload,
  ): Promise<DashboardAttentionCounts> {
    const [providers, complaints, contracts] = await Promise.all([
      this.canRead(admin, 'provider'),
      this.canRead(admin, 'complaint'),
      this.canRead(admin, 'contract'),
    ]);
    const count = async (sql: string, params: unknown[]) => {
      const [row] = await this.dataSource.query<Array<{ count: string }>>(
        sql,
        params,
      );
      return Number(row?.count ?? 0);
    };
    const [
      pendingProviderRequests,
      openComplaints,
      cancellationRequests,
      disputedContracts,
      terminationRequests,
    ] = await Promise.all([
      providers
        ? count(
            `SELECT COUNT(*) AS "count" FROM "providers"
            WHERE "status" = $1 AND "deletedAt" IS NULL`,
            [ProviderStatus.PENDING_APPROVAL],
          )
        : null,
      complaints
        ? count(
            `SELECT COUNT(*) AS "count" FROM "complaints" WHERE "status" IN ($1, $2)`,
            [ComplaintStatus.PENDING, ComplaintStatus.UNDER_REVIEW],
          )
        : null,
      contracts
        ? count(
            `SELECT COUNT(*) AS "count" FROM "contracts" WHERE "status" = $1`,
            [ContractStatus.CANCELLATION_REQUESTED],
          )
        : null,
      contracts
        ? count(
            `SELECT COUNT(*) AS "count" FROM "contracts" WHERE "status" = $1`,
            [ContractStatus.DISPUTED],
          )
        : null,
      providers
        ? count(
            `SELECT COUNT(*) AS "count" FROM "signed_contracts" WHERE "status" = $1`,
            [SignedContractStatus.TERMINATION_REQUESTED],
          )
        : null,
    ]);
    return {
      pendingProviderRequests,
      openComplaints,
      cancellationRequests,
      disputedContracts,
      terminationRequests,
    };
  }

  private windowParams(range: DashboardRange): [string, string, number] {
    const window = RANGE_WINDOWS[range];
    return [window.unit, STATISTICS_TIME_ZONE, window.buckets];
  }

  /** Mirrors AdminPermissionGuard for a single module's read access. */
  private async canRead(
    admin: AdminJwtPayload,
    module: string,
  ): Promise<boolean> {
    if (BYPASS_ROLES.has(admin.permissionType)) return true;
    const matches = await this.dataSource
      .getRepository(AdminPermission)
      .createQueryBuilder('ap')
      .innerJoin('ap.permission', 'p')
      .where('ap.adminId = :adminId', { adminId: admin.sub })
      .andWhere('p.module = :module', { module })
      .andWhere('(p.action = :action OR p.action = :fullAccess)', {
        action: 'read',
        fullAccess: 'full_access',
      })
      .andWhere('p.permissionPlatform = :platform', {
        platform: PermissionPlatform.ADMIN,
      })
      .getCount();
    return matches > 0;
  }
}
