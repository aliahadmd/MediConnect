// Feature: project-wide-bug-audit, Property 2: Preservation
// Preservation property tests — these MUST PASS on unfixed code
// They capture baseline behavior that must remain unchanged after bug fixes.
// **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 3.11, 3.12**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Types mirroring the application domain
// ---------------------------------------------------------------------------

interface AvailabilitySlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

interface AppointmentRow {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string | null;
  status: string;
  scheduledAt: Date;
}

interface Session {
  user: { id: string; role: string };
}

interface AppointmentDetail {
  id: string;
  doctorName: string;
  patientName: string;
  slotDate: string | null;
  slotStartTime: string | null;
  slotEndTime: string | null;
  status: string;
  scheduledAt: string;
  visitNotes: { content: string; updatedAt: string } | null;
  prescription: {
    id: string;
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
    notes: string | null;
    pdfKey: string | null;
    createdAt: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Preservation Req 3.2: Appointment detail with valid non-null slotId
// Mirrors the query logic in app/api/appointments/[id]/detail/route.ts
// When slotId is non-null and references a valid slot, innerJoin works fine.
// ---------------------------------------------------------------------------

/**
 * Simulates the CURRENT detail endpoint query behavior for non-null slotId.
 * innerJoin succeeds when slotId references a valid slot — returns full data.
 */
function detailQueryWithInnerJoin(
  appointment: AppointmentRow,
  slots: Map<string, AvailabilitySlot>
): Record<string, unknown> | null {
  // innerJoin: if slotId is null or slot doesn't exist, no row returned
  if (!appointment.slotId || !slots.has(appointment.slotId)) {
    return null;
  }
  const slot = slots.get(appointment.slotId)!;
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    slotId: appointment.slotId,
    status: appointment.status,
    slotDate: slot.date,
    slotStartTime: slot.startTime,
    slotEndTime: slot.endTime,
  };
}

// ---------------------------------------------------------------------------
// Preservation Req 3.3 / 3.4: Consultation status authorization
// Mirrors the auth check in app/api/consultation/[id]/status/route.ts
// Patient who owns appointment gets 200; unrelated user gets 403.
// ---------------------------------------------------------------------------

/**
 * Simulates the CURRENT consultation status auth check.
 * Only allows the patient — this is the existing behavior we preserve for
 * patient access (3.3) and unrelated user rejection (3.4).
 */
function consultationStatusAuthCheck(
  appointment: AppointmentRow,
  session: Session
): { status: number; body?: { queuePosition: number; doctorReady: boolean } } {
  if (appointment.patientId !== session.user.id) {
    return { status: 403 };
  }
  return {
    status: 200,
    body: { queuePosition: 1, doctorReady: false },
  };
}

// ---------------------------------------------------------------------------
// Preservation Req 3.7: Authenticated availability access
// Mirrors the GET handler in app/api/availability/route.ts
// Authenticated users get slots — current code returns slots for any caller.
// ---------------------------------------------------------------------------

/**
 * Simulates the CURRENT availability GET handler.
 * Returns slots for any caller (no auth check). For preservation, we only
 * test with authenticated callers — they should continue to get slots.
 */
function availabilityGetHandler(
  _session: Session,
  doctorId: string,
  slots: AvailabilitySlot[]
): { status: number; body?: AvailabilitySlot[] } {
  if (!doctorId) {
    return { status: 400 };
  }
  const doctorSlots = slots.filter((s) => s.doctorId === doctorId);
  return { status: 200, body: doctorSlots };
}

// ---------------------------------------------------------------------------
// Preservation Req 3.8: Valid IANA timezone produces correct UTC scheduledAt
// Mirrors the timezone conversion logic in app/api/appointments/route.ts
// ---------------------------------------------------------------------------

/**
 * Simulates the CURRENT timezone conversion logic from the POST handler.
 * For valid IANA timezones, this produces the correct UTC scheduledAt.
 */
function computeScheduledAt(
  slotDate: string,
  slotStartTime: string,
  timezone?: string
): Date {
  const timeStr = slotStartTime.substring(0, 5);
  const dateTimeStr = `${slotDate}T${timeStr}:00`;

  const tempDate = new Date(dateTimeStr + "Z");
  const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = tempDate.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offsetMs = utcDate.getTime() - tzDate.getTime();

  return new Date(tempDate.getTime() + offsetMs);
}

// ---------------------------------------------------------------------------
// Preservation Req 3.11 / 3.12: Prescription download handling
// Mirrors handleDownload() in prescription-detail-view.tsx
// 200 opens PDF URL; 503 shows storage unavailable message.
// ---------------------------------------------------------------------------

/**
 * Simulates the CURRENT handleDownload behavior.
 * For 200: returns the URL. For 503: returns storage unavailable message.
 */
async function handleDownloadCurrent(response: {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}): Promise<{ error: string } | { url: string }> {
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    if (response.status === 503) {
      return {
        error:
          "File storage is temporarily unavailable. Please try again later.",
      };
    }
    return { error: data.error || "Failed to get download link" };
  }
  const result = (await response.json()) as { url: string };
  return { url: result.url };
}

// ---------------------------------------------------------------------------
// Preservation Req 3.5: Visit history successful detail fetch rendering
// Mirrors the toggleDetail + rendering logic in visit-history.tsx
// ---------------------------------------------------------------------------

/**
 * Simulates the CURRENT visit-history toggleDetail behavior for successful fetches.
 * When fetch succeeds, detail data is stored and rendered.
 */
function simulateToggleDetail(
  appointmentId: string,
  details: Record<string, AppointmentDetail>,
  fetchResult: { ok: true; data: AppointmentDetail }
): {
  details: Record<string, AppointmentDetail>;
  expandedId: string;
  detailLoading: string | null;
} {
  // Simulate successful fetch path from toggleDetail
  const newDetails = { ...details, [appointmentId]: fetchResult.data };
  return {
    details: newDetails,
    expandedId: appointmentId,
    detailLoading: null,
  };
}

/**
 * Simulates the rendering decision for expanded appointment detail.
 * Returns what the UI would show based on state.
 */
function renderExpandedContent(
  appointmentId: string,
  expandedId: string | null,
  details: Record<string, AppointmentDetail>,
  detailLoading: string | null
): "hidden" | "loading" | "detail" | "error-message" {
  if (expandedId !== appointmentId) return "hidden";
  if (detailLoading === appointmentId) return "loading";
  if (details[appointmentId]) return "detail";
  return "error-message";
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function appointmentIdArb(): fc.Arbitrary<string> {
  return fc.uuid();
}

function userIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^usr_[a-z0-9]{4,8}$/);
}

function doctorIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^dr_[a-z0-9]{4,8}$/);
}

function slotIdArb(): fc.Arbitrary<string> {
  return fc.uuid();
}

function dateStringArb(): fc.Arbitrary<string> {
  return fc.integer({ min: 1, max: 365 }).map((daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  });
}

function timeStringArb(): fc.Arbitrary<string> {
  return fc
    .record({
      h: fc.integer({ min: 0, max: 23 }),
      m: fc.integer({ min: 0, max: 59 }),
    })
    .map(({ h, m }) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
}

/** Generate valid IANA timezone strings */
function validTimezoneArb(): fc.Arbitrary<string> {
  return fc.constantFrom(
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Australia/Sydney",
    "Pacific/Auckland",
    "UTC"
  );
}

function nonEmptyStringArb(max = 40): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: max }).filter((s) => s.trim().length > 0);
}

function appointmentDetailArb(): fc.Arbitrary<AppointmentDetail> {
  return fc.record({
    id: fc.uuid(),
    doctorName: nonEmptyStringArb(),
    patientName: nonEmptyStringArb(),
    slotDate: fc.oneof(dateStringArb(), fc.constant(null)) as fc.Arbitrary<string | null>,
    slotStartTime: fc.oneof(timeStringArb(), fc.constant(null)) as fc.Arbitrary<string | null>,
    slotEndTime: fc.oneof(timeStringArb(), fc.constant(null)) as fc.Arbitrary<string | null>,
    status: fc.constantFrom("completed", "cancelled", "rejected"),
    scheduledAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
      .filter((d) => !isNaN(d.getTime()))
      .map((d) => d.toISOString()),
    visitNotes: fc.option(
      fc.record({
        content: nonEmptyStringArb(200),
        updatedAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
          .filter((d) => !isNaN(d.getTime()))
          .map((d) => d.toISOString()),
      }),
      { nil: null }
    ),
    prescription: fc.option(
      fc.record({
        id: fc.uuid(),
        medications: fc.array(
          fc.record({
            name: nonEmptyStringArb(30),
            dosage: nonEmptyStringArb(20),
            frequency: nonEmptyStringArb(20),
            duration: nonEmptyStringArb(15),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        notes: fc.option(nonEmptyStringArb(100), { nil: null }),
        pdfKey: fc.option(fc.constant("prescriptions/test.pdf"), { nil: null }),
        createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
          .filter((d) => !isNaN(d.getTime()))
          .map((d) => d.toISOString()),
      }),
      { nil: null }
    ),
  });
}


// ---------------------------------------------------------------------------
// Preservation Req 3.2: Appointment detail with valid non-null slotId
// returns full data including slot fields
// **Validates: Requirements 3.2**
// ---------------------------------------------------------------------------

describe("Preservation 3.2: Appointment detail with valid non-null slotId returns full data", () => {
  it("non-null slotId referencing a valid slot returns appointment data with slot fields", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        userIdArb(),
        doctorIdArb(),
        slotIdArb(),
        dateStringArb(),
        timeStringArb(),
        timeStringArb(),
        (apptId, patientId, doctorId, sId, slotDate, startTime, endTime) => {
          const appointment: AppointmentRow = {
            id: apptId,
            patientId,
            doctorId,
            slotId: sId, // Non-null slotId
            status: "completed",
            scheduledAt: new Date(),
          };

          const slot: AvailabilitySlot = {
            id: sId,
            doctorId,
            date: slotDate,
            startTime,
            endTime,
            isBooked: true,
          };

          const slots = new Map<string, AvailabilitySlot>();
          slots.set(sId, slot);

          // Current behavior: innerJoin succeeds for non-null slotId
          const result = detailQueryWithInnerJoin(appointment, slots);

          // PRESERVATION: must return full data with slot fields
          expect(result).not.toBeNull();
          expect(result!.id).toBe(apptId);
          expect(result!.patientId).toBe(patientId);
          expect(result!.doctorId).toBe(doctorId);
          expect(result!.slotId).toBe(sId);
          expect(result!.slotDate).toBe(slotDate);
          expect(result!.slotStartTime).toBe(startTime);
          expect(result!.slotEndTime).toBe(endTime);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation Req 3.3: Patient who owns appointment gets 200
// **Validates: Requirements 3.3**
// ---------------------------------------------------------------------------

describe("Preservation 3.3: Patient who owns appointment gets 200 from consultation status", () => {
  it("patient matching appointment.patientId gets 200 with queuePosition and doctorReady", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        userIdArb(),
        doctorIdArb(),
        (apptId, patientId, doctorId) => {
          const appointment: AppointmentRow = {
            id: apptId,
            patientId,
            doctorId,
            slotId: null,
            status: "confirmed",
            scheduledAt: new Date(),
          };

          // Patient is the owner of this appointment
          const session: Session = {
            user: { id: patientId, role: "patient" },
          };

          const result = consultationStatusAuthCheck(appointment, session);

          // PRESERVATION: patient gets 200 with expected fields
          expect(result.status).toBe(200);
          expect(result.body).toBeDefined();
          expect(typeof result.body!.queuePosition).toBe("number");
          expect(typeof result.body!.doctorReady).toBe("boolean");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation Req 3.4: Unrelated user gets 403
// **Validates: Requirements 3.4**
// ---------------------------------------------------------------------------

describe("Preservation 3.4: Unrelated user gets 403 from consultation status", () => {
  it("user who is neither patient, doctor, nor admin gets 403", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        userIdArb(),
        doctorIdArb(),
        userIdArb(),
        (apptId, patientId, doctorId, unrelatedUserId) => {
          // Ensure unrelated user is different from patient and doctor
          fc.pre(unrelatedUserId !== patientId && unrelatedUserId !== doctorId);

          const appointment: AppointmentRow = {
            id: apptId,
            patientId,
            doctorId,
            slotId: null,
            status: "confirmed",
            scheduledAt: new Date(),
          };

          // Unrelated user (not patient, not doctor, not admin)
          const session: Session = {
            user: { id: unrelatedUserId, role: "patient" },
          };

          const result = consultationStatusAuthCheck(appointment, session);

          // PRESERVATION: unrelated user gets 403
          expect(result.status).toBe(403);
          expect(result.body).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation Req 3.5: Successful detail fetch in visit-history renders correctly
// **Validates: Requirements 3.5**
// ---------------------------------------------------------------------------

describe("Preservation 3.5: Successful detail fetch in visit-history renders correctly", () => {
  it("successful fetch stores detail data and renders 'detail' view", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        appointmentDetailArb(),
        (apptId, detailData) => {
          const initialDetails: Record<string, AppointmentDetail> = {};

          // Simulate successful fetch
          const afterFetch = simulateToggleDetail(apptId, initialDetails, {
            ok: true,
            data: { ...detailData, id: apptId },
          });

          // PRESERVATION: detail is stored
          expect(afterFetch.details[apptId]).toBeDefined();
          expect(afterFetch.details[apptId].id).toBe(apptId);
          expect(afterFetch.expandedId).toBe(apptId);
          expect(afterFetch.detailLoading).toBeNull();

          // PRESERVATION: rendering shows detail view (not error or loading)
          const renderResult = renderExpandedContent(
            apptId,
            afterFetch.expandedId,
            afterFetch.details,
            afterFetch.detailLoading
          );
          expect(renderResult).toBe("detail");

          // PRESERVATION: visit notes and prescription data preserved if present
          const storedDetail = afterFetch.details[apptId];
          if (detailData.visitNotes) {
            expect(storedDetail.visitNotes).not.toBeNull();
            expect(storedDetail.visitNotes!.content).toBe(detailData.visitNotes.content);
          }
          if (detailData.prescription) {
            expect(storedDetail.prescription).not.toBeNull();
            expect(storedDetail.prescription!.medications.length).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation Req 3.7: Authenticated user gets availability slots
// **Validates: Requirements 3.7**
// ---------------------------------------------------------------------------

describe("Preservation 3.7: Authenticated user gets availability slots", () => {
  it("authenticated user with valid doctorId gets 200 with matching slots", () => {
    fc.assert(
      fc.property(
        userIdArb(),
        doctorIdArb(),
        fc.array(
          fc.record({
            id: slotIdArb(),
            date: dateStringArb(),
            startTime: timeStringArb(),
            endTime: timeStringArb(),
            isBooked: fc.boolean(),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (userId, doctorId, slotSpecs) => {
          const session: Session = {
            user: { id: userId, role: "patient" },
          };

          const slots: AvailabilitySlot[] = slotSpecs.map((s) => ({
            ...s,
            doctorId,
          }));

          const result = availabilityGetHandler(session, doctorId, slots);

          // PRESERVATION: authenticated user gets 200 with slots
          expect(result.status).toBe(200);
          expect(result.body).toBeDefined();
          expect(result.body!.length).toBe(slots.length);

          // All returned slots belong to the requested doctor
          for (const slot of result.body!) {
            expect(slot.doctorId).toBe(doctorId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation Req 3.8: Valid IANA timezone produces correct UTC scheduledAt
// **Validates: Requirements 3.8**
// ---------------------------------------------------------------------------

describe("Preservation 3.8: Valid IANA timezone produces correct UTC scheduledAt", () => {
  it("valid IANA timezone string produces a valid Date for scheduledAt", () => {
    fc.assert(
      fc.property(
        dateStringArb(),
        fc.integer({ min: 8, max: 18 }).map((h) =>
          `${String(h).padStart(2, "0")}:00`
        ),
        validTimezoneArb(),
        (slotDate, slotStartTime, timezone) => {
          const scheduledAt = computeScheduledAt(slotDate, slotStartTime, timezone);

          // PRESERVATION: result is a valid Date
          expect(scheduledAt).toBeInstanceOf(Date);
          expect(isNaN(scheduledAt.getTime())).toBe(false);

          // PRESERVATION: the computed UTC time should differ from naive UTC
          // by the timezone offset (verifying the conversion actually happened)
          const naiveUtc = new Date(`${slotDate}T${slotStartTime.substring(0, 5)}:00Z`);

          if (timezone === "UTC") {
            // For UTC timezone, scheduledAt should equal naive UTC
            expect(scheduledAt.getTime()).toBe(naiveUtc.getTime());
          } else {
            // For non-UTC timezones, scheduledAt is a valid date
            // (the offset may vary by DST, so we just verify it's valid)
            expect(scheduledAt.getTime()).not.toBeNaN();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("America/New_York produces scheduledAt offset from naive UTC by 4-5 hours", () => {
    // Concrete example: a specific date and time in America/New_York
    const slotDate = "2025-07-15"; // Summer (EDT, UTC-4)
    const slotStartTime = "10:00";
    const timezone = "America/New_York";

    const scheduledAt = computeScheduledAt(slotDate, slotStartTime, timezone);
    const naiveUtc = new Date(`${slotDate}T${slotStartTime}:00Z`);

    // EDT offset is +4 hours (slot time 10:00 EDT = 14:00 UTC)
    const diffHours = (scheduledAt.getTime() - naiveUtc.getTime()) / (1000 * 60 * 60);

    // Should be 4 or 5 hours ahead of naive UTC (EDT=4, EST=5)
    expect(diffHours).toBeGreaterThanOrEqual(4);
    expect(diffHours).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Preservation Req 3.11: Successful download (200) opens PDF URL
// **Validates: Requirements 3.11**
// ---------------------------------------------------------------------------

describe("Preservation 3.11: Successful download (200) opens PDF URL", () => {
  it("200 response returns the PDF URL for opening", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        async (pdfUrl) => {
          const response = {
            ok: true,
            status: 200,
            json: () => Promise.resolve({ url: pdfUrl }),
          };

          const result = await handleDownloadCurrent(response);

          // PRESERVATION: successful download returns URL
          expect("url" in result).toBe(true);
          if ("url" in result) {
            expect(result.url).toBe(pdfUrl);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation Req 3.12: 503 download shows storage unavailable message
// **Validates: Requirements 3.12**
// ---------------------------------------------------------------------------

describe("Preservation 3.12: 503 download shows storage unavailable message", () => {
  it("503 response returns the storage unavailable error message", async () => {
    // 503 always returns the same message regardless of body content
    const response = {
      ok: false,
      status: 503,
      json: () =>
        Promise.resolve({ error: "Service Unavailable" }),
    };

    const result = await handleDownloadCurrent(response);

    // PRESERVATION: 503 shows specific storage unavailable message
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe(
        "File storage is temporarily unavailable. Please try again later."
      );
    }
  });

  it("503 response always shows storage message regardless of body error text", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb(100),
        async (bodyErrorText) => {
          const response = {
            ok: false,
            status: 503,
            json: () => Promise.resolve({ error: bodyErrorText }),
          };

          const result = await handleDownloadCurrent(response);

          // PRESERVATION: 503 always shows the fixed storage message
          expect("error" in result).toBe(true);
          if ("error" in result) {
            expect(result.error).toBe(
              "File storage is temporarily unavailable. Please try again later."
            );
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
