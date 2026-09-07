import { describe, it, expect } from "vitest";
import { computeLocationStatus, computeEfficiencyIndex, detectSessionAnomalies } from "@/lib/sla";

describe("computeLocationStatus", () => {
  const base = {
    isActive: true,
    hasActiveSession: false,
    hasOpenHighSeverityIssue: false,
    lastCompletedAt: null as Date | null,
    targetFrequencyMinutes: 60,
    dueSoonThresholdPercent: 75,
  };

  it("is UNAVAILABLE when the location is deactivated, regardless of anything else", () => {
    const result = computeLocationStatus({ ...base, isActive: false, hasActiveSession: true });
    expect(result.status).toBe("UNAVAILABLE");
  });

  it("is CLEANING when there is an active session, even if overdue", () => {
    const longAgo = new Date(Date.now() - 200 * 60 * 1000);
    const result = computeLocationStatus({ ...base, hasActiveSession: true, lastCompletedAt: longAgo });
    expect(result.status).toBe("CLEANING");
  });

  it("is ISSUE when a high/critical issue is open, taking priority over timing", () => {
    const result = computeLocationStatus({ ...base, hasOpenHighSeverityIssue: true, lastCompletedAt: new Date() });
    expect(result.status).toBe("ISSUE");
  });

  it("is NEVER_CLEANED when there is no cleaning history", () => {
    const result = computeLocationStatus({ ...base, lastCompletedAt: null });
    expect(result.status).toBe("NEVER_CLEANED");
  });

  it("is CLEAN comfortably inside the frequency window", () => {
    const result = computeLocationStatus({ ...base, lastCompletedAt: new Date(Date.now() - 10 * 60 * 1000) });
    expect(result.status).toBe("CLEAN");
  });

  it("is DUE_SOON at the configured threshold (75% of a 60-minute frequency = 45 minutes)", () => {
    const result = computeLocationStatus({ ...base, lastCompletedAt: new Date(Date.now() - 50 * 60 * 1000) });
    expect(result.status).toBe("DUE_SOON");
  });

  it("is OVERDUE once the full frequency window has elapsed, and reports minutes overdue", () => {
    const result = computeLocationStatus({ ...base, lastCompletedAt: new Date(Date.now() - 78 * 60 * 1000) });
    expect(result.status).toBe("OVERDUE");
    // "Bathroom should be cleaned every 60 minutes. Last cleaned 78 minutes ago. Overdue by 18 min." (spec section 15)
    expect(result.overdueByMinutes).toBeGreaterThanOrEqual(17);
    expect(result.overdueByMinutes).toBeLessThanOrEqual(19);
  });
});

describe("computeEfficiencyIndex", () => {
  it("is ~1.0 (on-target) when actual duration matches the target exactly", () => {
    const result = computeEfficiencyIndex(8 * 60, 8);
    expect(result.ratio).toBeCloseTo(1, 1);
    expect(result.variancePercent).toBe(0);
    expect(result.band).toBe("on-target");
  });

  it("reports +25% variance for a target-8-min cleaning that took 10 minutes (spec section 15 example)", () => {
    const result = computeEfficiencyIndex(10 * 60, 8);
    expect(result.variancePercent).toBe(25);
  });

  it("never returns a negative or judgmental value for a fast cleaning — just the ratio", () => {
    const result = computeEfficiencyIndex(4 * 60, 8);
    expect(result.band).toBe("faster");
    expect(result.variancePercent).toBeLessThan(0);
  });
});

describe("detectSessionAnomalies", () => {
  it("flags sessions under 30 seconds", () => {
    const flags = detectSessionAnomalies(15, 10);
    expect(flags.some((f) => f.type === "TOO_SHORT")).toBe(true);
  });

  it("flags sessions over 3x the target duration", () => {
    const flags = detectSessionAnomalies(10 * 60 * 4, 10);
    expect(flags.some((f) => f.type === "TOO_LONG")).toBe(true);
  });

  it("does not flag a normal-length session", () => {
    const flags = detectSessionAnomalies(9 * 60, 10);
    expect(flags).toHaveLength(0);
  });
});
