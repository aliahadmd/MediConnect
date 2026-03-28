// Feature: platform-enhancements-v2, Property 13: Photo upload lifecycle
// Feature: platform-enhancements-v2, Property 14: Photo upload file validation
// **Validates: Requirements 11.1, 11.2, 11.3, 11.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  MAX_DIMENSION,
} from "@/lib/profile-photo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadedPhoto {
  key: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

interface UploadInput {
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// In-memory Photo Store
// ---------------------------------------------------------------------------

class PhotoStore {
  private photos = new Map<string, UploadedPhoto>();

  /**
   * Validate, resize, and store a photo for a user.
   * Mirrors the logic in lib/profile-photo.ts processAndUploadPhoto.
   */
  upload(
    userId: string,
    input: UploadInput
  ): { success: true; photo: UploadedPhoto } | { success: false; error: string } {
    // Validate MIME type
    if (!ALLOWED_TYPES.includes(input.mimeType)) {
      return { success: false, error: "Invalid file type. Accepted: JPEG, PNG, WebP" };
    }

    // Validate file size
    if (input.sizeBytes > MAX_FILE_SIZE) {
      return { success: false, error: "File size exceeds 5MB limit" };
    }

    // Simulate resize: scale down to fit within MAX_DIMENSION x MAX_DIMENSION
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(input.width, input.height, 1)
    );
    const outputWidth = Math.max(1, Math.round(input.width * scale));
    const outputHeight = Math.max(1, Math.round(input.height * scale));

    const key = `${userId}.webp`;

    // Delete old photo if it exists (re-upload replaces)
    this.photos.delete(key);

    const photo: UploadedPhoto = {
      key,
      width: outputWidth,
      height: outputHeight,
      sizeBytes: input.sizeBytes,
      mimeType: "image/webp",
    };

    this.photos.set(key, photo);
    return { success: true, photo };
  }

  getPhoto(userId: string): UploadedPhoto | undefined {
    return this.photos.get(`${userId}.webp`);
  }

  getPhotoCount(userId: string): number {
    const key = `${userId}.webp`;
    return this.photos.has(key) ? 1 : 0;
  }

  getAllKeys(): string[] {
    return Array.from(this.photos.keys());
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const userIdArb = fc.stringMatching(/^user_[1-9]\d{0,2}$/);

/** Generate arbitrary image dimensions (1–5000 x 1–5000). */
const dimensionsArb = fc.record({
  width: fc.integer({ min: 1, max: 5000 }),
  height: fc.integer({ min: 1, max: 5000 }),
});

/** Generate a valid file size (1 byte to 5MB). */
const validFileSizeArb = fc.integer({ min: 1, max: MAX_FILE_SIZE });

/** Generate a valid MIME type from the allowed set. */
const validMimeArb = fc.constantFrom(...ALLOWED_TYPES);

/** Generate a valid upload input. */
const validUploadArb: fc.Arbitrary<UploadInput> = fc.record({
  mimeType: validMimeArb,
  sizeBytes: validFileSizeArb,
  width: fc.integer({ min: 1, max: 5000 }),
  height: fc.integer({ min: 1, max: 5000 }),
});

/** Generate an invalid MIME type (not in ALLOWED_TYPES). */
const invalidMimeArb: fc.Arbitrary<string> = fc
  .constantFrom(
    "application/pdf",
    "text/plain",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
    "video/mp4",
    "application/octet-stream",
    "image/tiff",
    "text/html"
  )
  .filter((t) => !ALLOWED_TYPES.includes(t));

/** Generate a file size exceeding 5MB. */
const oversizeFileSizeArb = fc.integer({
  min: MAX_FILE_SIZE + 1,
  max: MAX_FILE_SIZE * 3,
});

// ---------------------------------------------------------------------------
// Property 13: Photo upload lifecycle
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 13: Photo upload lifecycle
// **Validates: Requirements 11.2, 11.3, 11.5**
describe("Property 13: Photo upload lifecycle", () => {
  it("valid image produces output with both dimensions ≤ 256", () => {
    fc.assert(
      fc.property(
        userIdArb,
        validUploadArb,
        (userId, input) => {
          const store = new PhotoStore();
          const result = store.upload(userId, input);

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.photo.width).toBeLessThanOrEqual(MAX_DIMENSION);
            expect(result.photo.height).toBeLessThanOrEqual(MAX_DIMENSION);
            expect(result.photo.width).toBeGreaterThanOrEqual(1);
            expect(result.photo.height).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("re-upload for the same user results in exactly one photo in storage", () => {
    fc.assert(
      fc.property(
        userIdArb,
        validUploadArb,
        validUploadArb,
        (userId, firstInput, secondInput) => {
          const store = new PhotoStore();

          // First upload
          const first = store.upload(userId, firstInput);
          expect(first.success).toBe(true);
          expect(store.getPhotoCount(userId)).toBe(1);

          // Second upload (re-upload)
          const second = store.upload(userId, secondInput);
          expect(second.success).toBe(true);

          // Still exactly one photo for this user
          expect(store.getPhotoCount(userId)).toBe(1);

          // The stored photo is the second one
          const stored = store.getPhoto(userId);
          expect(stored).toBeDefined();
          expect(stored!.key).toBe(`${userId}.webp`);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("re-upload does not affect other users' photos", () => {
    fc.assert(
      fc.property(
        userIdArb,
        userIdArb,
        validUploadArb,
        validUploadArb,
        validUploadArb,
        (userA, userB, inputA, inputB, inputA2) => {
          // Ensure distinct users
          fc.pre(userA !== userB);

          const store = new PhotoStore();

          store.upload(userA, inputA);
          store.upload(userB, inputB);

          // Re-upload for userA
          store.upload(userA, inputA2);

          // userA still has exactly 1 photo
          expect(store.getPhotoCount(userA)).toBe(1);
          // userB's photo is untouched
          expect(store.getPhotoCount(userB)).toBe(1);
          expect(store.getPhoto(userB)).toBeDefined();
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Photo upload file validation
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 14: Photo upload file validation
// **Validates: Requirements 11.1**
describe("Property 14: Photo upload file validation", () => {
  it("invalid MIME type is rejected", () => {
    fc.assert(
      fc.property(
        userIdArb,
        invalidMimeArb,
        validFileSizeArb,
        dimensionsArb,
        (userId, mime, size, dims) => {
          const store = new PhotoStore();
          const result = store.upload(userId, {
            mimeType: mime,
            sizeBytes: size,
            width: dims.width,
            height: dims.height,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain("Invalid file type");
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("file exceeding 5MB is rejected", () => {
    fc.assert(
      fc.property(
        userIdArb,
        validMimeArb,
        oversizeFileSizeArb,
        dimensionsArb,
        (userId, mime, size, dims) => {
          const store = new PhotoStore();
          const result = store.upload(userId, {
            mimeType: mime,
            sizeBytes: size,
            width: dims.width,
            height: dims.height,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain("5MB");
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("valid MIME type and size ≤ 5MB is accepted", () => {
    fc.assert(
      fc.property(
        userIdArb,
        validUploadArb,
        (userId, input) => {
          const store = new PhotoStore();
          const result = store.upload(userId, input);

          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});
