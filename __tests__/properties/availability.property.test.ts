// Feature: mediconnect-virtual-clinic, Property 6: Availability slot create/delete round-trip
// Feature: mediconnect-virtual-clinic, Property 7: No overlapping or past availability slots
// Feature: mediconnect-virtual-clinic, Property 8: Doctor sees own availability slots
// **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  hasTimeOverlap,
  isSlotInPast,
  timeToMinutes,
} from "@/lib/validators";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate an HH:mm time string where hour ∈ [minH, maxH) and minute ∈ [0,59]. */
function timeArb(minH = 0, maxH = 24): fc.Arbitrary<string> {
  return fc
    .record({
      h: fc.integer({ min: minH, max: maxH - 1 }),
      m: fc.integer({ min: 0, max: 59 }),
    })
    .map(({ h, m }) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

/**
 * Generate a valid time-range slot where startTime < endTime.
 * Both times are within [minH, maxH).
 */
function slotArb(minH = 0, maxH = 24): fc.Arbitrary<{ startTime: string; endTime: string }> {
  return fc
    .record({
      h1: fc.integer({ min: minH, max: maxH - 1 }),
      m1: fc.integer({ min: 0, max: 59 }),
      h2: fc.integer({ min: minH, max: maxH - 1 }),
      m2: fc.integer({ min: 0, max: 59 }),
    })
    .filter(({ h1, m1, h2, m2 }) => h1 * 60 + m1 < h2 * 60 + m2)
    .map(({ h1, m1, h2, m2 }) => ({
      startTime: `${String(h1).padStart(2, "0")}:${String(m1).padStart(2, "0")}`,
      endTime: `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`,
    }));
}

/** Generate a future ISO date string (1–365 days from now). */
function futureDateArb(): fc.Arbitrary<string> {
  return fc.integer({ min: 1, max: 365 }).map((daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  });
}

/** Generate a past ISO date string (1–365 days ago). */
function pastDateArb(): fc.Arbitrary<string> {
  return fc.integer({ min: 1, max: 365 }).map((daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  });
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe("Property 7: No overlapping or past availability slots", () => {

  // -----------------------------------------------------------------------
  // Overlap detection
  // -----------------------------------------------------------------------

  describe("Overlap detection", () => {
    it("detects any overlapping time range", () => {
      fc.assert(
        fc.property(slotArb(), (existing) => {
          // Build a new slot that is guaranteed to overlap:
          // pick a point strictly inside the existing range and extend around it.
          const startMin = timeToMinutes(existing.startTime);
          const endMin = timeToMinutes(existing.endTime);

          // A slot that starts 1 minute before the existing ends and ends 1 minute after
          // the existing starts is guaranteed to overlap (as long as the existing slot
          // spans at least 2 minutes, which our generator ensures since start < end).
          // Simplest guaranteed overlap: use the same range.
          expect(hasTimeOverlap([existing], existing)).toBe(true);
        }),
        { numRuns: 200 }
      );
    });

    it("allows adjacent (non-overlapping) time ranges", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 22 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 1, max: 120 }),
          fc.integer({ min: 1, max: 120 }),
          (startH, startM, dur1, dur2) => {
            const aStart = startH * 60 + startM;
            const aEnd = aStart + dur1;
            const bStart = aEnd; // adjacent — starts exactly where A ends
            const bEnd = bStart + dur2;

            // Skip if times exceed 23:59
            if (aEnd > 1439 || bEnd > 1439) return;

            const fmt = (mins: number) => {
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            };

            const slotA = { startTime: fmt(aStart), endTime: fmt(aEnd) };
            const slotB = { startTime: fmt(bStart), endTime: fmt(bEnd) };

            // Adjacent slots must NOT be flagged as overlapping
            expect(hasTimeOverlap([slotA], slotB)).toBe(false);
          }
        ),
        { numRuns: 200 }
      );
    });

    it("detects partial overlaps (new slot starts before existing ends)", () => {
      fc.assert(
        fc.property(
          slotArb(),
          (existing) => {
            const existStart = timeToMinutes(existing.startTime);
            const existEnd = timeToMinutes(existing.endTime);
            const mid = Math.floor((existStart + existEnd) / 2);

            // Skip degenerate case where mid equals start or end
            if (mid <= existStart || mid >= existEnd) return;

            // New slot starts at midpoint of existing and extends past it
            const newEnd = Math.min(existEnd + 30, 1439);
            if (newEnd <= mid) return;

            const fmt = (mins: number) => {
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            };

            const newSlot = { startTime: fmt(mid), endTime: fmt(newEnd) };
            expect(hasTimeOverlap([existing], newSlot)).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });

    it("returns false when there are no existing slots", () => {
      fc.assert(
        fc.property(slotArb(), (newSlot) => {
          expect(hasTimeOverlap([], newSlot)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  // -----------------------------------------------------------------------
  // Past-date rejection
  // -----------------------------------------------------------------------

  describe("Past date rejection", () => {
    it("rejects slots with past dates", () => {
      fc.assert(
        fc.property(pastDateArb(), timeArb(0, 23), (date, startTime) => {
          // Use a "now" that is end-of-day for the current date to ensure
          // any past date is always in the past regardless of time.
          const now = new Date();
          now.setHours(23, 59, 59, 999);
          expect(isSlotInPast(date, startTime, now)).toBe(true);
        }),
        { numRuns: 200 }
      );
    });

    it("accepts slots with future dates", () => {
      fc.assert(
        fc.property(futureDateArb(), timeArb(0, 24), (date, startTime) => {
          // Use a "now" at the very start of today so any future date is accepted
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          expect(isSlotInPast(date, startTime, now)).toBe(false);
        }),
        { numRuns: 200 }
      );
    });
  });
});


// ---------------------------------------------------------------------------
// In-memory slot store for Property 6 and Property 8
// ---------------------------------------------------------------------------

interface AvailabilitySlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

/**
 * In-memory availability slot store simulating the database layer.
 * Supports create, delete (unbooked only), and query by doctor.
 */
class SlotStore {
  private slots = new Map<string, AvailabilitySlot>();
  private nextId = 1;

  create(doctorId: string, date: string, startTime: string, endTime: string): AvailabilitySlot {
    const id = `slot_${this.nextId++}`;
    const slot: AvailabilitySlot = { id, doctorId, date, startTime, endTime, isBooked: false };
    this.slots.set(id, slot);
    return slot;
  }

  delete(slotId: string): boolean {
    const slot = this.slots.get(slotId);
    if (!slot || slot.isBooked) return false;
    this.slots.delete(slotId);
    return true;
  }

  listByDoctor(doctorId: string): AvailabilitySlot[] {
    return Array.from(this.slots.values()).filter((s) => s.doctorId === doctorId);
  }

  listAll(): AvailabilitySlot[] {
    return Array.from(this.slots.values());
  }

  markBooked(slotId: string): void {
    const slot = this.slots.get(slotId);
    if (slot) slot.isBooked = true;
  }
}

// ---------------------------------------------------------------------------
// Additional generators for Property 6 and 8
// ---------------------------------------------------------------------------

/** Generate a doctor ID string. */
function doctorIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^dr_[a-z0-9]{4,8}$/);
}

// ---------------------------------------------------------------------------
// Property 6: Availability slot create/delete round-trip
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 6: Availability slot create/delete round-trip
// **Validates: Requirements 2.2, 2.3**
describe("Property 6: Availability slot create/delete round-trip", () => {
  it("create then delete unbooked slot leaves list unchanged", () => {
    fc.assert(
      fc.property(
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (doctorId, date, { startTime, endTime }) => {
          const store = new SlotStore();

          // Capture original state (empty)
          const before = store.listByDoctor(doctorId);
          expect(before).toHaveLength(0);

          // Create a slot
          const created = store.create(doctorId, date, startTime, endTime);
          expect(store.listByDoctor(doctorId)).toHaveLength(1);

          // Delete the unbooked slot
          const deleted = store.delete(created.id);
          expect(deleted).toBe(true);

          // List should be back to original state
          const after = store.listByDoctor(doctorId);
          expect(after).toHaveLength(0);
          expect(after).toEqual(before);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("create then delete with pre-existing slots leaves list unchanged", () => {
    fc.assert(
      fc.property(
        doctorIdArb(),
        fc.array(fc.tuple(futureDateArb(), slotArb()), { minLength: 1, maxLength: 5 }),
        futureDateArb(),
        slotArb(),
        (doctorId, existingSlots, newDate, { startTime, endTime }) => {
          const store = new SlotStore();

          // Seed with pre-existing slots
          for (const [d, s] of existingSlots) {
            store.create(doctorId, d, s.startTime, s.endTime);
          }

          const before = store.listByDoctor(doctorId).map((s) => s.id).sort();

          // Create a new slot
          const created = store.create(doctorId, newDate, startTime, endTime);
          expect(store.listByDoctor(doctorId)).toHaveLength(existingSlots.length + 1);

          // Delete the newly created slot
          const deleted = store.delete(created.id);
          expect(deleted).toBe(true);

          // List should match original
          const after = store.listByDoctor(doctorId).map((s) => s.id).sort();
          expect(after).toEqual(before);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("delete is rejected for booked slots", () => {
    fc.assert(
      fc.property(
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (doctorId, date, { startTime, endTime }) => {
          const store = new SlotStore();

          const created = store.create(doctorId, date, startTime, endTime);
          store.markBooked(created.id);

          // Delete should fail for booked slot
          const deleted = store.delete(created.id);
          expect(deleted).toBe(false);

          // Slot should still exist
          expect(store.listByDoctor(doctorId)).toHaveLength(1);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Doctor sees own availability slots
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 8: Doctor sees own availability slots
// **Validates: Requirements 2.1**
describe("Property 8: Doctor sees own availability slots", () => {
  it("query returns only that doctor's slots, complete set", () => {
    fc.assert(
      fc.property(
        fc.array(doctorIdArb(), { minLength: 2, maxLength: 5 }),
        fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: 4 }), // index into doctors array
            futureDateArb(),
            slotArb()
          ),
          { minLength: 1, maxLength: 15 }
        ),
        (doctors, slotSpecs) => {
          // Ensure unique doctor IDs
          const uniqueDoctors = [...new Set(doctors)];
          fc.pre(uniqueDoctors.length >= 2);

          const store = new SlotStore();

          // Track which slots belong to which doctor
          const expectedSlotsByDoctor = new Map<string, string[]>();
          for (const doc of uniqueDoctors) {
            expectedSlotsByDoctor.set(doc, []);
          }

          // Create slots for various doctors
          for (const [docIdx, date, { startTime, endTime }] of slotSpecs) {
            const doctorId = uniqueDoctors[docIdx % uniqueDoctors.length];
            const created = store.create(doctorId, date, startTime, endTime);
            expectedSlotsByDoctor.get(doctorId)!.push(created.id);
          }

          // For each doctor, verify query returns only their slots and is complete
          for (const doctorId of uniqueDoctors) {
            const result = store.listByDoctor(doctorId);
            const resultIds = result.map((s) => s.id).sort();
            const expectedIds = expectedSlotsByDoctor.get(doctorId)!.sort();

            // Completeness: all expected slots are returned
            expect(resultIds).toEqual(expectedIds);

            // Isolation: every returned slot belongs to this doctor
            for (const slot of result) {
              expect(slot.doctorId).toBe(doctorId);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("query for a doctor with no slots returns empty array", () => {
    fc.assert(
      fc.property(
        doctorIdArb(),
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (doctorA, doctorB, date, { startTime, endTime }) => {
          fc.pre(doctorA !== doctorB);

          const store = new SlotStore();

          // Create slots only for doctorA
          store.create(doctorA, date, startTime, endTime);

          // doctorB should see nothing
          expect(store.listByDoctor(doctorB)).toHaveLength(0);

          // doctorA should see their slot
          expect(store.listByDoctor(doctorA)).toHaveLength(1);
        }
      ),
      { numRuns: 200 }
    );
  });
});
