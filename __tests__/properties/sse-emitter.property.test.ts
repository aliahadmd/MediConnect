// Feature: platform-enhancements-v2, Property 4: SSE fan-out delivery
// **Validates: Requirements 4.2, 4.5**

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { SSEEventEmitter } from "@/lib/sse";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockController() {
  const enqueued: Uint8Array[] = [];
  return {
    controller: {
      enqueue: vi.fn((chunk: Uint8Array) => {
        enqueued.push(chunk);
      }),
    } as unknown as ReadableStreamDefaultController,
    enqueued,
  };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const connectionCountArb = fc.integer({ min: 1, max: 10 });

const userIdArb = fc.string({ minLength: 1, maxLength: 20 });

const notificationDataArb = fc.record({
  type: fc.string(),
  message: fc.string(),
});

// ---------------------------------------------------------------------------
// Property 4: SSE fan-out delivery
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 4: SSE fan-out delivery
// **Validates: Requirements 4.2, 4.5**
describe("Property 4: SSE fan-out delivery", () => {
  it("for any user with N registered connections, emitting a notification delivers to all N connections; emitting for a different user delivers to none", () => {
    fc.assert(
      fc.property(
        connectionCountArb,
        userIdArb,
        userIdArb,
        notificationDataArb,
        (n, userId1, userId2Raw, notification) => {
          // Ensure the two user IDs are different
          const userId2 = userId1 === userId2Raw ? userId2Raw + "_other" : userId2Raw;

          const emitter = new SSEEventEmitter();

          // Create N mock controllers for userId1 and register them
          const mocks = Array.from({ length: n }, () => createMockController());
          for (const mock of mocks) {
            emitter.register(userId1, mock.controller);
          }

          // Create a single mock controller for userId2
          const otherMock = createMockController();
          emitter.register(userId2, otherMock.controller);

          // Emit a notification for userId1
          emitter.emit(userId1, notification);

          const expectedMessage = `data: ${JSON.stringify(notification)}\n\n`;
          const decoder = new TextDecoder();

          // All N controllers for userId1 should have received the notification
          for (const mock of mocks) {
            expect(mock.enqueued).toHaveLength(1);
            expect(decoder.decode(mock.enqueued[0])).toBe(expectedMessage);
          }

          // userId2's controller should have received nothing
          expect(otherMock.enqueued).toHaveLength(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});
