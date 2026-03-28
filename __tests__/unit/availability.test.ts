/**
 * Unit tests for availability validation.
 *
 * Tests pure functions from lib/validators.ts:
 * - timeToMinutes: HH:mm → total minutes conversion
 * - hasTimeOverlap: overlap detection between time ranges
 * - isSlotInPast: past-date/time rejection
 *
 * Validates: Requirements 2.3, 2.4, 2.5
 */

import { describe, it, expect } from "vitest";
import { timeToMinutes, hasTimeOverlap, isSlotInPast } from "@/lib/validators";

// ---------------------------------------------------------------------------
// 1. timeToMinutes tests
// Validates: Requirement 2.4 (used by overlap detection)
// ---------------------------------------------------------------------------
describe("timeToMinutes", () => {
  it('"00:00" → 0', () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it('"12:00" → 720', () => {
    expect(timeToMinutes("12:00")).toBe(720);
  });

  it('"23:59" → 1439', () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it('"09:30" → 570', () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });
});

// ---------------------------------------------------------------------------
// 2. hasTimeOverlap tests
// Validates: Requirements 2.3, 2.4
// ---------------------------------------------------------------------------
describe("hasTimeOverlap", () => {
  it("detects identical time ranges as overlap", () => {
    const slot = { startTime: "09:00", endTime: "10:00" };
    expect(hasTimeOverlap([slot], slot)).toBe(true);
  });

  it("detects partial overlap (Slot B starts during Slot A)", () => {
    const slotA = { startTime: "09:00", endTime: "10:00" };
    const slotB = { startTime: "09:30", endTime: "10:30" };
    expect(hasTimeOverlap([slotA], slotB)).toBe(true);
  });

  it("allows adjacent time ranges (no overlap)", () => {
    const slotA = { startTime: "09:00", endTime: "10:00" };
    const slotB = { startTime: "10:00", endTime: "11:00" };
    expect(hasTimeOverlap([slotA], slotB)).toBe(false);
  });

  it("detects contained slot as overlap (Slot B inside Slot A)", () => {
    const slotA = { startTime: "09:00", endTime: "11:00" };
    const slotB = { startTime: "09:30", endTime: "10:30" };
    expect(hasTimeOverlap([slotA], slotB)).toBe(true);
  });

  it("allows non-overlapping slots with a gap", () => {
    const slotA = { startTime: "09:00", endTime: "10:00" };
    const slotB = { startTime: "11:00", endTime: "12:00" };
    expect(hasTimeOverlap([slotA], slotB)).toBe(false);
  });

  it("detects overlap when one of multiple existing slots overlaps", () => {
    const existing = [
      { startTime: "08:00", endTime: "09:00" },
      { startTime: "10:00", endTime: "11:00" },
      { startTime: "14:00", endTime: "15:00" },
    ];
    const newSlot = { startTime: "10:30", endTime: "11:30" };
    expect(hasTimeOverlap(existing, newSlot)).toBe(true);
  });

  it("returns false when existing slots list is empty", () => {
    const newSlot = { startTime: "09:00", endTime: "10:00" };
    expect(hasTimeOverlap([], newSlot)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. isSlotInPast tests
// Validates: Requirement 2.5
// ---------------------------------------------------------------------------
describe("isSlotInPast", () => {
  it("rejects yesterday's date as past", () => {
    const now = new Date("2025-06-15T12:00:00");
    expect(isSlotInPast("2025-06-14", "09:00", now)).toBe(true);
  });

  it("accepts tomorrow's date as not past", () => {
    const now = new Date("2025-06-15T12:00:00");
    expect(isSlotInPast("2025-06-16", "09:00", now)).toBe(false);
  });

  it("rejects today with a past time", () => {
    const now = new Date("2025-06-15T14:00:00");
    expect(isSlotInPast("2025-06-15", "09:00", now)).toBe(true);
  });

  it("accepts today with a future time", () => {
    const now = new Date("2025-06-15T08:00:00");
    expect(isSlotInPast("2025-06-15", "14:00", now)).toBe(false);
  });

  it("rejects slot at exact current time (boundary)", () => {
    const now = new Date("2025-06-15T09:00:00");
    expect(isSlotInPast("2025-06-15", "09:00", now)).toBe(false);
  });
});
