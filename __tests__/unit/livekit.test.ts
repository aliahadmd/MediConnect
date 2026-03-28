import { describe, it, expect } from "vitest";
import { getRoomName, isWithinJoinWindow } from "@/lib/livekit";

describe("getRoomName", () => {
  it("derives room name from appointment ID", () => {
    const id = "abc-123";
    expect(getRoomName(id)).toBe("consultation-abc-123");
  });

  it("produces different room names for different IDs", () => {
    expect(getRoomName("id-1")).not.toBe(getRoomName("id-2"));
  });
});

describe("isWithinJoinWindow", () => {
  it("returns true when now is exactly 5 minutes before scheduledAt", () => {
    const scheduled = new Date("2025-01-15T10:00:00Z");
    const now = new Date("2025-01-15T09:55:00Z");
    expect(isWithinJoinWindow(scheduled, now)).toBe(true);
  });

  it("returns true when now equals scheduledAt", () => {
    const scheduled = new Date("2025-01-15T10:00:00Z");
    expect(isWithinJoinWindow(scheduled, scheduled)).toBe(true);
  });

  it("returns true when now is exactly 30 minutes after scheduledAt", () => {
    const scheduled = new Date("2025-01-15T10:00:00Z");
    const now = new Date("2025-01-15T10:30:00Z");
    expect(isWithinJoinWindow(scheduled, now)).toBe(true);
  });

  it("returns false when now is more than 5 minutes before scheduledAt", () => {
    const scheduled = new Date("2025-01-15T10:00:00Z");
    const now = new Date("2025-01-15T09:54:59Z");
    expect(isWithinJoinWindow(scheduled, now)).toBe(false);
  });

  it("returns false when now is more than 30 minutes after scheduledAt", () => {
    const scheduled = new Date("2025-01-15T10:00:00Z");
    const now = new Date("2025-01-15T10:30:01Z");
    expect(isWithinJoinWindow(scheduled, now)).toBe(false);
  });

  it("returns true when now is within the window (e.g. 10 min after)", () => {
    const scheduled = new Date("2025-01-15T10:00:00Z");
    const now = new Date("2025-01-15T10:10:00Z");
    expect(isWithinJoinWindow(scheduled, now)).toBe(true);
  });
});
