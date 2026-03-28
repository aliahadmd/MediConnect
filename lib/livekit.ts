import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY!;
const apiSecret = process.env.LIVEKIT_API_SECRET!;

export function getRoomName(appointmentId: string): string {
  return `consultation-${appointmentId}`;
}

export async function createRoomToken(
  appointmentId: string,
  participantName: string,
  participantId: string
): Promise<string> {
  const roomName = getRoomName(appointmentId);
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
  });
  token.addGrant({ roomJoin: true, room: roomName });
  return await token.toJwt();
}

export function isWithinJoinWindow(
  scheduledAt: Date,
  now: Date = new Date()
): boolean {
  const fiveMinBefore = new Date(scheduledAt.getTime() - 5 * 60 * 1000);
  const thirtyMinAfter = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
  return now >= fiveMinBefore && now <= thirtyMinAfter;
}
