import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { sseEmitter } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
  let streamController: ReadableStreamDefaultController | undefined;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      sseEmitter.register(userId, controller);

      const encoder = new TextEncoder();
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":heartbeat\n\n"));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30_000);
    },
    cancel() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (streamController) {
        sseEmitter.unregister(userId, streamController);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
