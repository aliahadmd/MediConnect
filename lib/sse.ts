type SSEConnection = {
  controller: ReadableStreamDefaultController;
  createdAt: Date;
};

class SSEEventEmitter {
  private connections: Map<string, Set<SSEConnection>>;

  constructor() {
    this.connections = new Map();
  }

  register(userId: string, controller: ReadableStreamDefaultController): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add({
      controller,
      createdAt: new Date(),
    });
  }

  unregister(
    userId: string,
    controller: ReadableStreamDefaultController
  ): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;

    for (const conn of userConnections) {
      if (conn.controller === controller) {
        userConnections.delete(conn);
        break;
      }
    }

    if (userConnections.size === 0) {
      this.connections.delete(userId);
    }
  }

  emit(userId: string, data: object): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;

    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    const stale: SSEConnection[] = [];

    for (const conn of userConnections) {
      try {
        conn.controller.enqueue(encoded);
      } catch {
        stale.push(conn);
      }
    }

    for (const conn of stale) {
      userConnections.delete(conn);
    }

    if (userConnections.size === 0) {
      this.connections.delete(userId);
    }
  }

  getConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size ?? 0;
  }
}

export const sseEmitter = new SSEEventEmitter();
export { SSEEventEmitter, type SSEConnection };
