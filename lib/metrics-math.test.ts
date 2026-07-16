import { describe, expect, it } from "vitest";

import {
  roundCostUsd,
  roundTo,
  safePercentage,
  summarizeJobStatusCounts,
  totalPages,
} from "./metrics-math";

describe("roundTo", () => {
  it("rounds to the given number of decimals", () => {
    expect(roundTo(1.23456, 2)).toBe(1.23);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
});

describe("safePercentage", () => {
  it("returns 0 when total is 0", () => {
    expect(safePercentage(0, 0)).toBe(0);
    expect(safePercentage(5, 0)).toBe(0);
  });

  it("computes a rounded percentage", () => {
    expect(safePercentage(1, 3)).toBe(33.3);
    expect(safePercentage(2, 2)).toBe(100);
  });
});

describe("roundCostUsd", () => {
  it("passes through null", () => {
    expect(roundCostUsd(null)).toBeNull();
  });

  it("rounds to 4 decimals", () => {
    expect(roundCostUsd(0.123456)).toBe(0.1235);
  });
});

describe("summarizeJobStatusCounts", () => {
  it("handles zero jobs without dividing by zero", () => {
    const summary = summarizeJobStatusCounts({});
    expect(summary).toEqual({
      total: 0,
      success: { count: 0, pct: 0 },
      error: { count: 0, pct: 0 },
    });
  });

  it("classifies completed and needs_review as success", () => {
    const summary = summarizeJobStatusCounts({
      completed: 6,
      needs_review: 2,
      failed: 1,
      expired: 1,
      queued: 0,
    });
    expect(summary.total).toBe(10);
    expect(summary.success).toEqual({ count: 8, pct: 80 });
    expect(summary.error).toEqual({ count: 2, pct: 20 });
  });

  it("classifies failed, expired, and cancelled as errors", () => {
    const summary = summarizeJobStatusCounts({
      failed: 1,
      expired: 1,
      cancelled: 1,
    });
    expect(summary.error).toEqual({ count: 3, pct: 100 });
    expect(summary.success).toEqual({ count: 0, pct: 0 });
  });

  it("excludes queued/processing from both success and error", () => {
    const summary = summarizeJobStatusCounts({ queued: 5, processing: 5 });
    expect(summary.total).toBe(10);
    expect(summary.success.count).toBe(0);
    expect(summary.error.count).toBe(0);
  });
});

describe("totalPages", () => {
  it("returns at least 1 page even when there are no rows", () => {
    expect(totalPages({ page: 1, pageSize: 10, totalCount: 0 })).toBe(1);
  });

  it("rounds up to cover the remainder", () => {
    expect(totalPages({ page: 1, pageSize: 10, totalCount: 21 })).toBe(3);
    expect(totalPages({ page: 1, pageSize: 10, totalCount: 20 })).toBe(2);
  });
});
