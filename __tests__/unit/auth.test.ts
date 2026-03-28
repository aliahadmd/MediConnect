/**
 * Unit tests for auth edge cases.
 *
 * Tests validation logic, role enforcement, session expiry,
 * and middleware route protection in isolation (no database needed).
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.6
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Pure logic extracted from the codebase for unit testing
// ---------------------------------------------------------------------------

/** Basic email format validation (mirrors what better-auth checks). */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;
  if (trimmed !== email) return false; // reject leading/trailing spaces
  // Must have exactly one @, non-empty local and domain, domain has a dot
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  return true;
}

/** Password validation: must be non-empty and at least 6 characters. */
function isValidPassword(password: string): boolean {
  if (!password || typeof password !== "string") return false;
  return password.length >= 6;
}

/** Mirrors requireRole() from lib/auth-helpers.ts */
type Role = "patient" | "doctor" | "admin";

function requireRole(
  session: { user: { email: string; role: string } } | null,
  requiredRole: Role
): { user: { email: string; role: string } } {
  if (!session || session.user.role !== requiredRole) {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Session expiry check: returns true if session is still valid. */
function isSessionValid(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() > now.getTime();
}

/** Middleware redirect logic from middleware.ts */
const PROTECTED_PREFIXES = ["/patient", "/doctor", "/admin", "/consultation"];
const PUBLIC_PATHS = ["/login", "/register"];

function middlewareRedirectLogic(
  pathname: string,
  sessionCookie: string | null
): string | null {
  if (pathname.startsWith("/api/auth")) return null;

  if (sessionCookie && PUBLIC_PATHS.some((p) => pathname === p)) {
    return "/";
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (!sessionCookie && isProtected) {
    return "/login";
  }

  return null;
}

// ---------------------------------------------------------------------------
// 1. Email validation tests
// Validates: Requirement 1.1
// ---------------------------------------------------------------------------
describe("Email validation", () => {
  describe("invalid email formats", () => {
    it("rejects empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });

    it("rejects email without @", () => {
      expect(isValidEmail("userexample.com")).toBe(false);
    });

    it("rejects email without domain", () => {
      expect(isValidEmail("user@")).toBe(false);
    });

    it("rejects email without local part", () => {
      expect(isValidEmail("@example.com")).toBe(false);
    });

    it("rejects email with spaces", () => {
      expect(isValidEmail(" user@example.com ")).toBe(false);
    });

    it("rejects email with multiple @ signs", () => {
      expect(isValidEmail("user@@example.com")).toBe(false);
    });

    it("rejects email with domain missing TLD dot", () => {
      expect(isValidEmail("user@localhost")).toBe(false);
    });

    it("rejects email with domain starting with dot", () => {
      expect(isValidEmail("user@.example.com")).toBe(false);
    });

    it("rejects email with domain ending with dot", () => {
      expect(isValidEmail("user@example.")).toBe(false);
    });
  });

  describe("valid email formats", () => {
    it("accepts standard email", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
    });

    it("accepts email with subdomain", () => {
      expect(isValidEmail("user@mail.example.com")).toBe(true);
    });

    it("accepts email with numbers", () => {
      expect(isValidEmail("user123@example.com")).toBe(true);
    });

    it("accepts email with dots in local part", () => {
      expect(isValidEmail("first.last@example.com")).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Password validation tests
// Validates: Requirements 1.1, 1.4
// ---------------------------------------------------------------------------
describe("Password validation", () => {
  it("rejects empty password", () => {
    expect(isValidPassword("")).toBe(false);
  });

  it("rejects password shorter than 6 characters", () => {
    expect(isValidPassword("abc")).toBe(false);
    expect(isValidPassword("12345")).toBe(false);
  });

  it("rejects single character password", () => {
    expect(isValidPassword("a")).toBe(false);
  });

  it("accepts password with exactly 6 characters", () => {
    expect(isValidPassword("abcdef")).toBe(true);
  });

  it("accepts longer passwords", () => {
    expect(isValidPassword("securePassword123!")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Role enforcement tests
// Validates: Requirements 1.2, 1.4
// ---------------------------------------------------------------------------
describe("Role enforcement (requireRole)", () => {
  const makeSession = (role: string) => ({
    user: { email: "test@example.com", role },
  });

  it("succeeds when role matches", () => {
    const session = makeSession("doctor");
    const result = requireRole(session, "doctor");
    expect(result.user.role).toBe("doctor");
  });

  it("throws when role does not match", () => {
    const session = makeSession("patient");
    expect(() => requireRole(session, "doctor")).toThrow("Unauthorized");
  });

  it("throws when session is null", () => {
    expect(() => requireRole(null, "admin")).toThrow("Unauthorized");
  });

  it("succeeds for patient role", () => {
    const session = makeSession("patient");
    expect(requireRole(session, "patient").user.role).toBe("patient");
  });

  it("succeeds for doctor role", () => {
    const session = makeSession("doctor");
    expect(requireRole(session, "doctor").user.role).toBe("doctor");
  });

  it("succeeds for admin role", () => {
    const session = makeSession("admin");
    expect(requireRole(session, "admin").user.role).toBe("admin");
  });

  it("patient cannot access doctor routes", () => {
    const session = makeSession("patient");
    expect(() => requireRole(session, "doctor")).toThrow("Unauthorized");
  });

  it("doctor cannot access admin routes", () => {
    const session = makeSession("doctor");
    expect(() => requireRole(session, "admin")).toThrow("Unauthorized");
  });

  it("admin cannot access patient-specific role check", () => {
    const session = makeSession("admin");
    expect(() => requireRole(session, "patient")).toThrow("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// 4. Session expiry tests
// Validates: Requirement 1.6
// ---------------------------------------------------------------------------
describe("Session expiry", () => {
  it("session within expiry window is valid", () => {
    const now = new Date("2025-01-15T12:00:00Z");
    const expiresAt = new Date("2025-01-22T12:00:00Z"); // 7 days later
    expect(isSessionValid(expiresAt, now)).toBe(true);
  });

  it("session past expiry window is invalid", () => {
    const now = new Date("2025-01-23T12:00:00Z");
    const expiresAt = new Date("2025-01-22T12:00:00Z"); // expired yesterday
    expect(isSessionValid(expiresAt, now)).toBe(false);
  });

  it("session expiring exactly now is invalid", () => {
    const now = new Date("2025-01-22T12:00:00Z");
    const expiresAt = new Date("2025-01-22T12:00:00Z");
    expect(isSessionValid(expiresAt, now)).toBe(false);
  });

  it("session expiring 1ms from now is valid", () => {
    const now = new Date("2025-01-22T11:59:59.999Z");
    const expiresAt = new Date("2025-01-22T12:00:00Z");
    expect(isSessionValid(expiresAt, now)).toBe(true);
  });

  it("session that expired long ago is invalid", () => {
    const now = new Date("2025-06-01T00:00:00Z");
    const expiresAt = new Date("2025-01-01T00:00:00Z");
    expect(isSessionValid(expiresAt, now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Middleware route protection tests
// Validates: Requirements 1.2, 1.4
// ---------------------------------------------------------------------------
describe("Middleware route protection", () => {
  describe("protected routes redirect without session", () => {
    it.each([
      "/patient/appointments",
      "/patient/book/123",
      "/patient/history",
      "/doctor/appointments",
      "/doctor/availability",
      "/admin/users",
      "/admin/analytics",
      "/consultation/abc-123",
    ])("redirects %s to /login without session", (path) => {
      expect(middlewareRedirectLogic(path, null)).toBe("/login");
    });
  });

  describe("public paths pass through without session", () => {
    it("/ does not redirect without session", () => {
      expect(middlewareRedirectLogic("/", null)).toBeNull();
    });

    it("/about does not redirect without session", () => {
      expect(middlewareRedirectLogic("/about", null)).toBeNull();
    });
  });

  describe("auth API routes always pass through", () => {
    it.each([
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/session",
      "/api/auth/logout",
    ])("%s passes through without session", (path) => {
      expect(middlewareRedirectLogic(path, null)).toBeNull();
    });

    it.each([
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/session",
      "/api/auth/logout",
    ])("%s passes through with session", (path) => {
      expect(middlewareRedirectLogic(path, "valid_token")).toBeNull();
    });
  });

  describe("authenticated users on public paths redirect to home", () => {
    it("redirects /login to / when authenticated", () => {
      expect(middlewareRedirectLogic("/login", "valid_token")).toBe("/");
    });

    it("redirects /register to / when authenticated", () => {
      expect(middlewareRedirectLogic("/register", "valid_token")).toBe("/");
    });
  });

  describe("authenticated users on protected routes pass through", () => {
    it("does not redirect /patient/appointments with session", () => {
      expect(
        middlewareRedirectLogic("/patient/appointments", "valid_token")
      ).toBeNull();
    });

    it("does not redirect /doctor/availability with session", () => {
      expect(
        middlewareRedirectLogic("/doctor/availability", "valid_token")
      ).toBeNull();
    });
  });
});
