import { describe, it, expect, vi } from "vitest";
import { SSEEventEmitter } from "@/lib/sse";

describe("SSEEventEmitter", () => {
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

  it("should register and track connections for a user", () => {
    const emitter = new SSEEventEmitter();
    const { controller } = createMockController();

    emitter.register("user1", controller);
    expect(emitter.getConnectionCount("user1")).toBe(1);
  });

  it("should support multiple connections per user", () => {
    const emitter = new SSEEventEmitter();
    const { controller: c1 } = createMockController();
    const { controller: c2 } = createMockController();

    emitter.register("user1", c1);
    emitter.register("user1", c2);
    expect(emitter.getConnectionCount("user1")).toBe(2);
  });

  it("should return 0 for unknown users", () => {
    const emitter = new SSEEventEmitter();
    expect(emitter.getConnectionCount("unknown")).toBe(0);
  });

  it("should unregister a specific connection", () => {
    const emitter = new SSEEventEmitter();
    const { controller: c1 } = createMockController();
    const { controller: c2 } = createMockController();

    emitter.register("user1", c1);
    emitter.register("user1", c2);
    emitter.unregister("user1", c1);

    expect(emitter.getConnectionCount("user1")).toBe(1);
  });

  it("should clean up user entry when last connection is unregistered", () => {
    const emitter = new SSEEventEmitter();
    const { controller } = createMockController();

    emitter.register("user1", controller);
    emitter.unregister("user1", controller);

    expect(emitter.getConnectionCount("user1")).toBe(0);
  });

  it("should be a no-op when unregistering from unknown user", () => {
    const emitter = new SSEEventEmitter();
    const { controller } = createMockController();

    // Should not throw
    emitter.unregister("unknown", controller);
    expect(emitter.getConnectionCount("unknown")).toBe(0);
  });

  it("should emit SSE-formatted data to all user connections", () => {
    const emitter = new SSEEventEmitter();
    const mock1 = createMockController();
    const mock2 = createMockController();

    emitter.register("user1", mock1.controller);
    emitter.register("user1", mock2.controller);

    const payload = { type: "test", message: "hello" };
    emitter.emit("user1", payload);

    const expected = `data: ${JSON.stringify(payload)}\n\n`;
    const decoder = new TextDecoder();

    expect(decoder.decode(mock1.enqueued[0])).toBe(expected);
    expect(decoder.decode(mock2.enqueued[0])).toBe(expected);
  });

  it("should not emit to other users' connections", () => {
    const emitter = new SSEEventEmitter();
    const mock1 = createMockController();
    const mock2 = createMockController();

    emitter.register("user1", mock1.controller);
    emitter.register("user2", mock2.controller);

    emitter.emit("user1", { msg: "for user1" });

    expect(mock1.controller.enqueue).toHaveBeenCalledTimes(1);
    expect(mock2.controller.enqueue).not.toHaveBeenCalled();
  });

  it("should silently remove connections that fail on enqueue", () => {
    const emitter = new SSEEventEmitter();
    const goodMock = createMockController();
    const badController = {
      enqueue: vi.fn(() => {
        throw new Error("Controller closed");
      }),
    } as unknown as ReadableStreamDefaultController;

    emitter.register("user1", goodMock.controller);
    emitter.register("user1", badController);

    expect(emitter.getConnectionCount("user1")).toBe(2);

    emitter.emit("user1", { test: true });

    // Bad connection should be removed
    expect(emitter.getConnectionCount("user1")).toBe(1);
    // Good connection should still receive data
    expect(goodMock.controller.enqueue).toHaveBeenCalledTimes(1);
  });

  it("should be a no-op when emitting to a user with no connections", () => {
    const emitter = new SSEEventEmitter();
    // Should not throw
    emitter.emit("unknown", { data: "test" });
  });
});
