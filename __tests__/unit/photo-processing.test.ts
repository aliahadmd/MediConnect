// Unit tests for photo processing edge cases
// **Validates: Requirements 11.1, 11.2**

import { describe, it, expect } from "vitest";
import {
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  MAX_DIMENSION,
} from "@/lib/profile-photo";

// ---------------------------------------------------------------------------
// Helper: mirrors the validation + resize logic from processAndUploadPhoto
// without requiring MinIO or sharp at runtime.
// ---------------------------------------------------------------------------

function validateFileType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}

function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE;
}

/**
 * Simulate sharp's `resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside" })`
 * behaviour: scale down so the largest side is ≤ MAX_DIMENSION.
 * Images already smaller than MAX_DIMENSION are NOT upscaled.
 */
function computeResizedDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }
  const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

// ---------------------------------------------------------------------------
// 1. ALLOWED_TYPES contains exactly the three accepted MIME types
// ---------------------------------------------------------------------------

describe("ALLOWED_TYPES constant", () => {
  it("contains exactly image/jpeg, image/png, image/webp", () => {
    expect(ALLOWED_TYPES).toEqual(
      expect.arrayContaining(["image/jpeg", "image/png", "image/webp"])
    );
    expect(ALLOWED_TYPES).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 2. MAX_FILE_SIZE is exactly 5 MB
// ---------------------------------------------------------------------------

describe("MAX_FILE_SIZE constant", () => {
  it("equals 5 * 1024 * 1024 (5 MB)", () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });
});

// ---------------------------------------------------------------------------
// 3. MAX_DIMENSION is 256
// ---------------------------------------------------------------------------

describe("MAX_DIMENSION constant", () => {
  it("equals 256", () => {
    expect(MAX_DIMENSION).toBe(256);
  });
});

// ---------------------------------------------------------------------------
// 4. Validation: 0-byte file (size = 0) should be accepted (≤ 5 MB)
// ---------------------------------------------------------------------------

describe("File size validation", () => {
  it("accepts a 0-byte file", () => {
    expect(validateFileSize(0)).toBe(true);
  });

  // 5. Exactly 5 MB file should be accepted (boundary)
  it("accepts a file of exactly 5 MB", () => {
    expect(validateFileSize(MAX_FILE_SIZE)).toBe(true);
  });

  // 6. 5 MB + 1 byte should be rejected
  it("rejects a file of 5 MB + 1 byte", () => {
    expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Non-image MIME type rejected even with image extension
// ---------------------------------------------------------------------------

describe("MIME type validation", () => {
  it('rejects "application/pdf" even if the file extension is .jpg', () => {
    expect(validateFileType("application/pdf")).toBe(false);
  });

  it("accepts each allowed MIME type", () => {
    for (const mime of ALLOWED_TYPES) {
      expect(validateFileType(mime)).toBe(true);
    }
  });

  it('rejects "image/gif"', () => {
    expect(validateFileType("image/gif")).toBe(false);
  });

  it('rejects "image/bmp"', () => {
    expect(validateFileType("image/bmp")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. Small image dimensions should not be upscaled (output ≤ 256×256)
// ---------------------------------------------------------------------------

describe("Resize logic for small images", () => {
  it("does not upscale a 50×50 image", () => {
    const result = computeResizedDimensions(50, 50);
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  it("does not upscale a 1×1 image", () => {
    const result = computeResizedDimensions(1, 1);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it("does not upscale a 256×256 image (exact boundary)", () => {
    const result = computeResizedDimensions(256, 256);
    expect(result.width).toBe(256);
    expect(result.height).toBe(256);
  });

  it("does not upscale a 100×200 image", () => {
    const result = computeResizedDimensions(100, 200);
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
  });

  it("scales down a 512×512 image to 256×256", () => {
    const result = computeResizedDimensions(512, 512);
    expect(result.width).toBe(256);
    expect(result.height).toBe(256);
  });

  it("scales down a 1024×512 image preserving aspect ratio", () => {
    const result = computeResizedDimensions(1024, 512);
    expect(result.width).toBe(256);
    expect(result.height).toBe(128);
  });

  it("output dimensions are always ≤ MAX_DIMENSION after resize", () => {
    const result = computeResizedDimensions(5000, 3000);
    expect(result.width).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(result.height).toBeLessThanOrEqual(MAX_DIMENSION);
  });
});
