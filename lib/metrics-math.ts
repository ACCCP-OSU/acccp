/**
 * Pure math for the admin Metrics tab — kept separate from
 * lib/actions/admin-metrics.ts so it's unit-testable without a database.
 */

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Returns 0 (not NaN) when `total` is 0. */
export function safePercentage(count: number, total: number): number {
  if (total <= 0) return 0
  return roundTo((count / total) * 100, 1)
}

export function roundCostUsd(value: number | null): number | null {
  if (value === null) return null
  return roundTo(value, 4)
}

/**
 * job_status carries states with no "did this work?" meaning of their own.
 * `needs_review` still produced usable HTML, so it counts as success; the
 * terminal states that leave nothing usable count as errors. Matches
 * toConversionStatus() in lib/actions/documents.ts.
 */
export interface JobStatusCounts {
  queued?: number
  processing?: number
  needs_review?: number
  completed?: number
  failed?: number
  expired?: number
  cancelled?: number
}

export interface JobStatusSummary {
  total: number
  success: { count: number; pct: number }
  error: { count: number; pct: number }
}

const SUCCESS_STATUSES = ["completed", "needs_review"] as const
const ERROR_STATUSES = ["failed", "expired", "cancelled"] as const

export function summarizeJobStatusCounts(
  counts: JobStatusCounts
): JobStatusSummary {
  const total = Object.values(counts).reduce(
    (sum: number, n) => sum + (n ?? 0),
    0
  )
  const successCount = SUCCESS_STATUSES.reduce(
    (sum, status) => sum + (counts[status] ?? 0),
    0
  )
  const errorCount = ERROR_STATUSES.reduce(
    (sum, status) => sum + (counts[status] ?? 0),
    0
  )

  return {
    total,
    success: { count: successCount, pct: safePercentage(successCount, total) },
    error: { count: errorCount, pct: safePercentage(errorCount, total) },
  }
}

export interface PageInfo {
  page: number
  pageSize: number
  totalCount: number
}

/** 1-indexed page count, minimum 1 so an empty table still shows page 1 of 1. */
export function totalPages({ pageSize, totalCount }: PageInfo): number {
  return Math.max(1, Math.ceil(totalCount / pageSize))
}
