export const PLATFORM_STATS_UPDATED_EVENT = 'platformStatsUpdated';
export const ADMIN_DASHBOARD_STATS_UPDATED_EVENT = 'adminDashboardStatsUpdated';

export const STATISTICS_TIME_ZONE = 'Asia/Riyadh';

/** Coalesces bursts of writes into one recount and one push. */
export const STATISTICS_DEBOUNCE_MS = 500;

/**
 * Safety net for writes the entity subscriber cannot see (raw SQL, other API
 * instances): recount on this interval and push only if something changed.
 */
export const STATISTICS_RECONCILE_MS = 60_000;
