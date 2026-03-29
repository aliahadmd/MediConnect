# Project-Wide Bug Audit — Bugfix Design

## Overview

This design addresses 11 bugs identified across the MediConnect Virtual Clinic codebase, spanning race conditions, query failures, authorization gaps, missing error handling, absent indexes, and maintainability issues. Each bug is analyzed with a formal bug condition, hypothesized root cause, and targeted fix. The overarching strategy is minimal, surgical changes that correct defective behavior while preserving all existing functionality.

## Glossary

- **Bug_Condition (C)**: The specific input/state combination that triggers each bug
- **Property (P)**: The desired correct behavior when the bug condition holds
- **Preservation**: Existing behavior that must remain unchanged after each fix
- **`db.transaction()`**: Drizzle ORM method for executing queries within a PostgreSQL transaction
- **`innerJoin` / `leftJoin`**: Drizzle ORM join methods; `innerJoin` excludes rows with no match, `leftJoin` includes them with nulls
- **IANA timezone**: A timezone identifier from the IANA Time Zone Database (e.g., `"America/New_York"`)
- **Cascade delete**: A foreign key rule that automatically deletes child rows when the parent row is deleted

## Bug Details

### Bug 1: Review Race Condition (app/api/reviews/route.ts)

#### Bug Condition

The bug manifests when two concurrent POST requests to `/api/reviews` target the same `appointmentId`. The existence check (`SELECT` from `reviews`) runs outside the transaction, so both requests see no existing review and both proceed to insert, causing a unique constraint violation or duplicate data.

**Formal Specification:**
```
FUNCTION isBugCondition_1(input)
  INPUT: input of type { request1: ReviewRequest, request2: ReviewRequest }
  OUTPUT: boolean

  RETURN request1.appointmentId == request2.appointmentId
         AND request1 and request2 arrive concurrently
         AND no review exists for appointmentId at start of both requests
END FUNCTION
```

#### Examples

- Two browser tabs submit a review for appointment `abc-123` within milliseconds → both succeed, creating duplicate reviews
- Single request for an appointment with no existing review → correctly inserts (not a bug condition)
- Single request for an appointment with an existing review → correctly returns 409 (not a bug condition)

### Bug 2: Null slotId 500 Error (app/api/appointments/[id]/detail/route.ts)

#### Bug Condition

The bug manifests when `GET /api/appointments/[id]/detail` is called for an appointment whose `slotId` is null. The `innerJoin` with `availabilitySlots` requires a matching row, so the query returns zero rows and the endpoint returns 404 (or 500 if the destructuring fails).

**Formal Specification:**
```
FUNCTION isBugCondition_2(input)
  INPUT: input of type { appointmentId: string }
  OUTPUT: boolean

  appointment := db.select(appointments).where(id == appointmentId)
  RETURN appointment.slotId IS NULL
END FUNCTION
```

#### Examples

- Appointment created via migration 0002 with null `slotId` → detail endpoint returns no rows → 404/500
- Appointment with valid `slotId` referencing an existing slot → returns full data (not a bug condition)

### Bug 3 & 4: Consultation Status Authorization (app/api/consultation/[id]/status/route.ts)

#### Bug Condition

The bug manifests when a doctor assigned to the appointment or an admin calls `GET /api/consultation/[id]/status`. The endpoint only checks `appointment.patientId === session.user.id`, so doctors and admins receive 403.

**Formal Specification:**
```
FUNCTION isBugCondition_3_4(input)
  INPUT: input of type { userId: string, userRole: string, appointmentId: string }
  OUTPUT: boolean

  appointment := db.select(appointments).where(id == appointmentId)
  RETURN (input.userId == appointment.doctorId AND input.userRole == "doctor")
         OR (input.userRole == "admin")
END FUNCTION
```

#### Examples

- Doctor assigned to appointment calls status endpoint → 403 Forbidden (bug)
- Admin calls status endpoint → 403 Forbidden (bug)
- Patient who owns the appointment calls status endpoint → 200 OK (not a bug condition)
- Unrelated user calls status endpoint → 403 Forbidden (correct, not a bug condition)

### Bug 5: Visit History Silent Fetch Failure (components/appointments/visit-history.tsx)

#### Bug Condition

The bug manifests when the `fetch()` call inside `toggleDetail()` fails (network error, non-OK response). The catch block silently swallows the error, leaving `detailLoading` cleared but no detail data set, so the UI shows "Unable to load appointment details" with no retry option.

**Formal Specification:**
```
FUNCTION isBugCondition_5(input)
  INPUT: input of type { appointmentId: string, fetchResult: "network_error" | "non_ok_response" }
  OUTPUT: boolean

  RETURN fetchResult IN ["network_error", "non_ok_response"]
END FUNCTION
```

#### Examples

- Network timeout when expanding appointment details → spinner disappears, static error message, no retry
- Server returns 500 → same stuck state
- Successful fetch → details render correctly (not a bug condition)

### Bug 6: Missing Database Indexes (lib/db/schema.ts)

#### Bug Condition

The bug manifests when queries filter on `appointments.patientId`, `appointments.doctorId`, `appointments.status`, `reviews.doctorId`, or `notifications.userId` on tables with many rows. Without indexes, PostgreSQL performs sequential scans.

**Formal Specification:**
```
FUNCTION isBugCondition_6(input)
  INPUT: input of type { query: SQLQuery }
  OUTPUT: boolean

  RETURN query.filterColumns INTERSECT {"appointments.patientId", "appointments.doctorId",
         "appointments.status", "reviews.doctorId", "notifications.userId"} IS NOT EMPTY
         AND correspondingIndex DOES NOT EXIST
END FUNCTION
```

### Bug 7: Unauthenticated Availability Access (app/api/availability/route.ts)

#### Bug Condition

The bug manifests when an unauthenticated user calls `GET /api/availability?doctorId=X`. The GET handler has no auth check, exposing doctor schedules publicly.

**Formal Specification:**
```
FUNCTION isBugCondition_7(input)
  INPUT: input of type { request: HTTPRequest }
  OUTPUT: boolean

  RETURN request.method == "GET"
         AND request.path == "/api/availability"
         AND request.session IS NULL
END FUNCTION
```

### Bug 8: Invalid Timezone Handling (app/api/appointments/route.ts)

#### Bug Condition

The bug manifests when a patient submits a booking with an invalid IANA timezone string. The `toLocaleString()` call with an invalid timezone either throws or produces garbage UTC offsets.

**Formal Specification:**
```
FUNCTION isBugCondition_8(input)
  INPUT: input of type { timezone: string }
  OUTPUT: boolean

  RETURN timezone IS NOT NULL
         AND timezone NOT IN Intl.supportedValuesOf("timeZone")
END FUNCTION
```

#### Examples

- `timezone: "NotATimezone/Fake"` → `toLocaleString()` throws RangeError or produces wrong offset
- `timezone: "America/New_York"` → correct UTC conversion (not a bug condition)
- `timezone: undefined` → no conversion attempted (not a bug condition)

### Bug 9: Hardcoded Status Strings (multiple files)

#### Bug Condition

The bug manifests when appointment status values are used as string literals across multiple files. Any rename or addition requires finding and updating every occurrence, risking inconsistency.

**Formal Specification:**
```
FUNCTION isBugCondition_9(input)
  INPUT: input of type { codebase: SourceFiles }
  OUTPUT: boolean

  RETURN COUNT(files using hardcoded "pending"|"confirmed"|"completed"|"cancelled"|"rejected") > 1
         AND no shared constant module exists
END FUNCTION
```

### Bug 10: Missing Cascade Deletes (lib/db/schema.ts)

#### Bug Condition

The bug manifests when an appointment row is deleted. Child rows in `prescriptions`, `visitNotes`, and `reviews` that reference the appointment via foreign key are left orphaned.

**Formal Specification:**
```
FUNCTION isBugCondition_10(input)
  INPUT: input of type { appointmentId: string }
  OUTPUT: boolean

  RETURN EXISTS(prescriptions WHERE appointmentId == input.appointmentId)
         OR EXISTS(visitNotes WHERE appointmentId == input.appointmentId)
         OR EXISTS(reviews WHERE appointmentId == input.appointmentId)
         AND appointment is being deleted
         AND onDelete rule is NOT "cascade"
END FUNCTION
```

### Bug 11: Prescription Download Error Handling (components/prescriptions/prescription-detail-view.tsx)

#### Bug Condition

The bug manifests when the prescription download endpoint returns a non-503, non-OK response (e.g., 400, 404, 500). The code calls `res.json()` which may fail if the body is not valid JSON, and the error message lacks HTTP status context.

**Formal Specification:**
```
FUNCTION isBugCondition_11(input)
  INPUT: input of type { response: HTTPResponse }
  OUTPUT: boolean

  RETURN response.status != 200
         AND response.status != 503
         AND (response.body is not valid JSON OR error message lacks status context)
END FUNCTION
```

#### Examples

- Download returns 404 → `res.json()` may throw, user sees generic "Download failed"
- Download returns 500 with HTML error page → `res.json()` throws
- Download returns 503 → handled correctly with specific message (not a bug condition)
- Download returns 200 → PDF opens in new tab (not a bug condition)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Single review submissions for completed appointments with no existing review continue to insert and return 201
- Appointments with non-null `slotId` continue to return full detail data including slot fields
- Patients who own an appointment continue to access consultation status
- Unrelated users continue to receive 403 on consultation status
- Successful detail fetches in visit history continue to render correctly
- All existing query results remain semantically identical (indexes are transparent)
- Authenticated users continue to access availability data
- Valid IANA timezone strings continue to produce correct UTC `scheduledAt` values
- All status comparisons continue to evaluate to the same string values
- Normal CRUD on prescriptions, visit notes, and reviews continues to work
- Successful prescription downloads (200) continue to open PDF in new tab
- 503 prescription errors continue to show the storage unavailable message

**Scope:**
All inputs that do NOT match the bug conditions above should be completely unaffected by these fixes. This includes all normal authenticated API calls, valid data queries, successful UI fetches, and standard CRUD operations.

## Hypothesized Root Cause

### Bug 1: Review Race Condition
The existence check (`SELECT` from `reviews` WHERE `appointmentId`) runs before `db.transaction()` begins. Two concurrent requests both see no existing review, then both enter the transaction and insert. The fix is to move the check inside the transaction with row-level locking.

### Bug 2: Null slotId Query Failure
The `innerJoin(availabilitySlots, eq(availabilitySlots.id, appointments.slotId))` requires a matching row. When `slotId` is null, no match exists, so the entire query returns zero rows. The fix is to use `leftJoin`.

### Bug 3 & 4: Consultation Status Auth
The authorization check is `appointment.patientId !== session.user.id` with no alternative paths for doctors or admins. The fix is to add checks for `appointment.doctorId === session.user.id` and `session.user.role === "admin"`.

### Bug 5: Silent Fetch Failure
The `catch` block in `toggleDetail()` is empty. When the fetch fails, `detailLoading` is cleared but no error state is set, so the UI falls through to the `!isLoadingDetail && !detail` branch which shows a static message with no retry. The fix is to add an error state and a retry button.

### Bug 6: Missing Indexes
The schema definition in `lib/db/schema.ts` uses `pgTable()` without any `.index()` calls on frequently queried foreign key and filter columns. The fix is to add Drizzle ORM indexes.

### Bug 7: Unauthenticated Availability GET
The `GET` handler in `app/api/availability/route.ts` has no `getSession()` or `requireRole()` call. The `POST` handler correctly requires doctor role. The fix is to add `getSession()` to the GET handler.

### Bug 8: Invalid Timezone
The `createAppointmentSchema` defines `timezone` as `z.string().optional()` with no IANA validation. The `toLocaleString()` call in the POST handler uses the raw string. The fix is to add a Zod refinement that validates against `Intl.supportedValuesOf("timeZone")`.

### Bug 9: Hardcoded Status Strings
Status values like `"pending"`, `"confirmed"`, etc. are used as string literals in route handlers, components, and tests. No shared constant exists. The fix is to create `lib/constants.ts` with exported constants.

### Bug 10: Missing Cascade Deletes
The foreign key references in `prescriptions`, `visitNotes`, and `reviews` use the default `onDelete` behavior (which is `NO ACTION` in PostgreSQL). The fix is to add `{ onDelete: "cascade" }` to the `.references()` calls.

### Bug 11: Prescription Download Error Handling
The `handleDownload` function calls `res.json()` for all non-OK responses before checking the status code. If the response body is not JSON (e.g., HTML error page), this throws. The 503 check happens after the JSON parse. The fix is to check status first, then attempt JSON parse with a fallback.

## Correctness Properties

Property 1: Bug Condition - Review Race Condition Prevention

_For any_ pair of concurrent review submission requests targeting the same `appointmentId`, the fixed `POST /api/reviews` handler SHALL ensure that exactly one review is inserted and the second request receives a 409 Conflict response, by performing the existence check inside the database transaction.

**Validates: Requirements 2.1**

Property 2: Preservation - Single Review Submission

_For any_ single review submission request for a completed appointment with no existing review, the fixed handler SHALL produce the same result as the original: insert the review, update doctor profile aggregates, and return 201.

**Validates: Requirements 3.1**

Property 3: Bug Condition - Null slotId Detail Query

_For any_ appointment where `slotId` is null, the fixed `GET /api/appointments/[id]/detail` endpoint SHALL return the appointment data with null values for `slotDate`, `slotStartTime`, and `slotEndTime` instead of returning a 500 error or empty result.

**Validates: Requirements 2.2**

Property 4: Preservation - Non-Null slotId Detail Query

_For any_ appointment where `slotId` references a valid availability slot, the fixed endpoint SHALL produce the same result as the original, including full slot date, start time, and end time.

**Validates: Requirements 3.2**

Property 5: Bug Condition - Doctor/Admin Consultation Status Access

_For any_ request to `GET /api/consultation/[id]/status` where the caller is the assigned doctor or an admin, the fixed endpoint SHALL return 200 with `queuePosition` and `doctorReady` fields.

**Validates: Requirements 2.3, 2.4**

Property 6: Preservation - Patient and Unauthorized Consultation Status Access

_For any_ request to `GET /api/consultation/[id]/status` where the caller is the owning patient, the fixed endpoint SHALL continue to return 200. For any caller who is neither the patient, the assigned doctor, nor an admin, the fixed endpoint SHALL continue to return 403.

**Validates: Requirements 3.3, 3.4**

Property 7: Bug Condition - Visit History Fetch Error Recovery

_For any_ detail fetch failure in `visit-history.tsx` (network error or non-OK response), the fixed component SHALL display an error message and a retry button, clearing the loading spinner.

**Validates: Requirements 2.5**

Property 8: Preservation - Visit History Successful Fetch

_For any_ successful detail fetch, the fixed component SHALL continue to display appointment details (visit notes, prescription info) identically to the original behavior.

**Validates: Requirements 3.5**

Property 9: Bug Condition - Database Index Existence

_For any_ query filtering on `appointments.patientId`, `appointments.doctorId`, `appointments.status`, `reviews.doctorId`, or `notifications.userId`, the fixed schema SHALL have indexes on these columns to prevent full table scans.

**Validates: Requirements 2.6**

Property 10: Preservation - Query Result Consistency

_For any_ query using the indexed columns, the fixed schema SHALL return semantically identical results to the original (indexes do not change query semantics).

**Validates: Requirements 3.6**

Property 11: Bug Condition - Unauthenticated Availability Rejection

_For any_ unauthenticated `GET /api/availability` request, the fixed endpoint SHALL return 401 Unauthorized.

**Validates: Requirements 2.7**

Property 12: Preservation - Authenticated Availability Access

_For any_ authenticated `GET /api/availability?doctorId=X` request, the fixed endpoint SHALL continue to return the doctor's availability slots.

**Validates: Requirements 3.7**

Property 13: Bug Condition - Invalid Timezone Rejection

_For any_ appointment booking request with a `timezone` value that is not a valid IANA timezone identifier, the fixed `POST /api/appointments` endpoint SHALL return 400 with a validation error.

**Validates: Requirements 2.8**

Property 14: Preservation - Valid Timezone Handling

_For any_ appointment booking request with a valid IANA timezone string, the fixed endpoint SHALL produce the same `scheduledAt` UTC value as the original.

**Validates: Requirements 3.8**

Property 15: Bug Condition - Shared Status Constants

_For any_ usage of appointment status values in the codebase, the fixed code SHALL reference shared constants from `lib/constants.ts` instead of hardcoded string literals.

**Validates: Requirements 2.9**

Property 16: Preservation - Status Value Equivalence

_For any_ status comparison or query, the shared constants SHALL map to the exact same string values as the original hardcoded strings, preserving all existing behavior.

**Validates: Requirements 3.9**

Property 17: Bug Condition - Cascade Delete Propagation

_For any_ appointment deletion where related `prescriptions`, `visitNotes`, or `reviews` exist, the fixed schema SHALL cascade the deletion to all related child rows.

**Validates: Requirements 2.10**

Property 18: Preservation - Normal CRUD on Related Records

_For any_ normal create, read, update operations on prescriptions, visit notes, and reviews, the fixed schema SHALL continue to work identically to the original.

**Validates: Requirements 3.10**

Property 19: Bug Condition - Prescription Download Non-JSON Error Handling

_For any_ prescription download response that is non-OK and non-503, the fixed component SHALL handle JSON parse failures gracefully and display a user-friendly error message with HTTP status context (e.g., "Prescription not found" for 404).

**Validates: Requirements 2.11**

Property 20: Preservation - Successful and 503 Download Handling

_For any_ successful download (200), the fixed component SHALL continue to open the PDF URL in a new tab. For 503 responses, the fixed component SHALL continue to display the storage unavailable message.

**Validates: Requirements 3.11, 3.12**

## Fix Implementation

### Changes Required

#### Bug 1: Review Race Condition

**File**: `app/api/reviews/route.ts`

**Function**: `POST` handler

**Specific Changes**:
1. **Move existence check inside transaction**: Relocate the `SELECT` from `reviews` WHERE `appointmentId` into the `db.transaction()` callback
2. **Add row-level locking**: Use `.for("update")` on the appointment select inside the transaction to serialize concurrent requests
3. **Move appointment verification inside transaction**: Move all pre-insert checks (appointment exists, status is completed, belongs to patient, no existing review) inside the transaction block
4. **Return 409 from within transaction**: If a review already exists (detected inside the transaction), return the conflict error

**Pseudocode:**
```
const result = await db.transaction(async (tx) => {
  // Lock the appointment row
  const [appointment] = await tx.select().from(appointments)
    .where(eq(appointments.id, appointmentId)).for("update");
  
  // All validation checks here...
  
  // Check existing review inside transaction
  const [existing] = await tx.select().from(reviews)
    .where(eq(reviews.appointmentId, appointmentId));
  if (existing) return { error: "already exists", status: 409 };
  
  // Insert review and update aggregates
  ...
});
```

#### Bug 2: Null slotId Query Failure

**File**: `app/api/appointments/[id]/detail/route.ts`

**Function**: `GET` handler

**Specific Changes**:
1. **Change `innerJoin` to `leftJoin`**: Replace `.innerJoin(availabilitySlots, eq(availabilitySlots.id, appointments.slotId))` with `.leftJoin(availabilitySlots, eq(availabilitySlots.id, appointments.slotId))`
2. **No other changes needed**: The response already handles null slot fields since `leftJoin` returns null for unmatched columns

#### Bug 3 & 4: Consultation Status Authorization

**File**: `app/api/consultation/[id]/status/route.ts`

**Function**: `GET` handler

**Specific Changes**:
1. **Expand authorization check**: Replace the single patient check with a compound check that allows the patient, the assigned doctor, or an admin
2. **Check user role for admin**: Use `session.user.role === "admin"` as an additional access path

**Pseudocode:**
```
const userId = session.user.id;
const role = session.user.role as string;

if (
  appointment.patientId !== userId &&
  appointment.doctorId !== userId &&
  role !== "admin"
) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

#### Bug 5: Visit History Silent Fetch Failure

**File**: `components/appointments/visit-history.tsx`

**Function**: `toggleDetail()` and `VisitHistory` component

**Specific Changes**:
1. **Add error state**: Add `detailError` state variable (`string | null`) to track which appointment ID had a fetch error
2. **Set error on failure**: In the `catch` block and when `res.ok` is false, set `detailError` to the appointment ID
3. **Clear error on retry**: When `toggleDetail` is called for an appointment with an error, clear the error and retry the fetch
4. **Render error UI**: In the expanded card content, show an error message with a "Retry" button when `detailError` matches the appointment ID

#### Bug 6: Missing Database Indexes

**File**: `lib/db/schema.ts`

**Specific Changes**:
1. **Add index on `appointments.patientId`**: Using Drizzle's index API
2. **Add index on `appointments.doctorId`**: Using Drizzle's index API
3. **Add index on `appointments.status`**: Using Drizzle's index API
4. **Add index on `reviews.doctorId`**: Using Drizzle's index API
5. **Add index on `notifications.userId`**: Using Drizzle's index API

**Note**: Drizzle ORM uses the third argument to `pgTable()` for indexes:
```
pgTable("appointments", { ... }, (table) => [
  index("idx_appointments_patient_id").on(table.patientId),
  index("idx_appointments_doctor_id").on(table.doctorId),
  index("idx_appointments_status").on(table.status),
])
```

#### Bug 7: Unauthenticated Availability GET

**File**: `app/api/availability/route.ts`

**Function**: `GET` handler

**Specific Changes**:
1. **Add auth check**: Add `getSession()` call at the start of the GET handler, returning 401 if unauthenticated

**Pseudocode:**
```
export async function GET(request: NextRequest) {
  try {
    await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... existing logic
}
```

#### Bug 8: Invalid Timezone Handling

**File**: `lib/validators.ts`

**Function**: `createAppointmentSchema`

**Specific Changes**:
1. **Add timezone validation**: Change `timezone: z.string().optional()` to include a `.refine()` that validates against `Intl.supportedValuesOf("timeZone")`

**Pseudocode:**
```
timezone: z.string().optional().refine(
  (tz) => {
    if (!tz) return true; // optional, so undefined is fine
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: "Invalid IANA timezone identifier" }
),
```

#### Bug 9: Shared Status Constants

**File**: `lib/constants.ts` (new file)

**Specific Changes**:
1. **Create constants file**: Export `APPOINTMENT_STATUS` object with `PENDING`, `CONFIRMED`, `REJECTED`, `COMPLETED`, `CANCELLED` keys mapping to the corresponding string values
2. **Export type**: Export `AppointmentStatus` type derived from the constants

**Pseudocode:**
```
export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];
```

#### Bug 10: Cascade Delete Rules

**File**: `lib/db/schema.ts`

**Specific Changes**:
1. **Add `onDelete: "cascade"` to `prescriptions.appointmentId`**: Modify the `.references()` call
2. **Add `onDelete: "cascade"` to `visitNotes.appointmentId`**: Modify the `.references()` call
3. **Add `onDelete: "cascade"` to `reviews.appointmentId`**: Modify the `.references()` call

**Note**: This requires a new Drizzle migration to alter the foreign key constraints.

#### Bug 11: Prescription Download Error Handling

**File**: `components/prescriptions/prescription-detail-view.tsx`

**Function**: `handleDownload()`

**Specific Changes**:
1. **Check status before JSON parse**: Restructure the error handling to check `res.status` first
2. **Wrap JSON parse in try/catch**: Handle cases where the response body is not valid JSON
3. **Map status codes to user-friendly messages**: 404 → "Prescription not found", 500 → "Server error", etc.
4. **Keep 503 handling**: Preserve the existing 503-specific message

**Pseudocode:**
```
if (!res.ok) {
  if (res.status === 503) {
    throw new Error("File storage is temporarily unavailable. Please try again later.");
  }
  
  let errorMessage: string;
  try {
    const data = await res.json();
    errorMessage = data.error || "";
  } catch {
    errorMessage = "";
  }
  
  if (res.status === 404) {
    throw new Error(errorMessage || "Prescription not found");
  } else if (res.status === 400) {
    throw new Error(errorMessage || "Invalid request");
  } else {
    throw new Error(errorMessage || `Server error (${res.status})`);
  }
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that exercise each bug condition on the unfixed code to observe failures and confirm root causes.

**Test Cases**:
1. **Review Race Condition Test**: Simulate two concurrent review POST requests for the same appointment — expect both to succeed on unfixed code (will fail on unfixed code by producing duplicates)
2. **Null slotId Detail Test**: Create an appointment with null `slotId` and call the detail endpoint — expect 500/404 on unfixed code (will fail on unfixed code)
3. **Doctor Consultation Status Test**: Call consultation status as the assigned doctor — expect 403 on unfixed code (will fail on unfixed code)
4. **Admin Consultation Status Test**: Call consultation status as admin — expect 403 on unfixed code (will fail on unfixed code)
5. **Visit History Fetch Error Test**: Simulate a network error in toggleDetail — expect no error UI on unfixed code (will fail on unfixed code)
6. **Unauthenticated Availability Test**: Call GET /api/availability without auth — expect 200 on unfixed code (will fail on unfixed code)
7. **Invalid Timezone Test**: Submit booking with `timezone: "Invalid/Zone"` — expect no validation error on unfixed code (will fail on unfixed code)
8. **Prescription Non-JSON Error Test**: Simulate a 404 response with HTML body on download — expect JSON parse error on unfixed code (will fail on unfixed code)

**Expected Counterexamples**:
- Duplicate review rows inserted for the same appointment
- Empty query result for appointments with null slotId
- 403 responses for legitimate doctor/admin access
- Missing error UI on fetch failures
- Availability data exposed without authentication
- Invalid scheduledAt values from bad timezone strings
- Unhandled JSON parse errors on non-JSON error responses

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_N(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior_N(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same results as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition_N(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for normal inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Single Review Preservation**: Observe that single review submissions work on unfixed code, verify they continue after fix
2. **Non-Null slotId Preservation**: Observe that detail queries with valid slotId work on unfixed code, verify they continue after fix
3. **Patient Consultation Access Preservation**: Observe that patient access works on unfixed code, verify it continues after fix
4. **Successful Detail Fetch Preservation**: Observe that successful fetches render correctly on unfixed code, verify they continue after fix
5. **Authenticated Availability Preservation**: Observe that authenticated availability access works on unfixed code, verify it continues after fix
6. **Valid Timezone Preservation**: Observe that valid timezone bookings produce correct scheduledAt on unfixed code, verify they continue after fix
7. **Successful Download Preservation**: Observe that 200 downloads open PDF on unfixed code, verify they continue after fix
8. **503 Download Preservation**: Observe that 503 shows storage message on unfixed code, verify it continues after fix

### Unit Tests

- Test review POST with concurrent requests (mocked transaction behavior)
- Test appointment detail query with null vs non-null slotId
- Test consultation status authorization for patient, doctor, admin, and unauthorized users
- Test visit-history toggleDetail error state, retry, and success paths
- Test availability GET with and without authentication
- Test timezone validation with valid and invalid IANA strings
- Test prescription download error handling for 200, 400, 404, 500, 503 responses
- Test shared status constants map to correct string values

### Property-Based Tests

- Generate random pairs of concurrent review requests and verify at most one succeeds per appointment
- Generate random appointments with nullable slotId and verify detail endpoint returns data for all
- Generate random user/role/appointment combinations and verify correct authorization decisions
- Generate random IANA timezone strings (valid and invalid) and verify validation correctness
- Generate random HTTP status codes and response bodies and verify prescription error handling
- Generate random appointment deletions and verify cascade propagation to child tables

### Integration Tests

- Test full review submission flow including concurrent race scenario
- Test appointment detail flow for appointments created with and without slots
- Test consultation status flow for all three authorized roles
- Test visit history expand/collapse with error recovery
- Test appointment booking flow with timezone validation end-to-end
- Test appointment deletion cascade across prescriptions, visit notes, and reviews
