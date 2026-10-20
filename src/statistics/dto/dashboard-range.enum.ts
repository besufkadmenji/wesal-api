import { registerEnumType } from '@nestjs/graphql';

/** UI-14: period shown by the admin dashboard charts. */
export enum DashboardRange {
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_12_MONTHS = 'LAST_12_MONTHS',
}

registerEnumType(DashboardRange, {
  name: 'DashboardRange',
  description:
    'Admin dashboard chart period: 7 or 30 daily buckets, or 12 monthly buckets (Asia/Riyadh)',
});
