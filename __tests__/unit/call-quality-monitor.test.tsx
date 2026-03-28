import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionQuality } from "livekit-client";

// Mock LiveKit hooks
const mockUseLocalParticipant = vi.fn();
const mockUseRemoteParticipants = vi.fn();
const mockUseConnectionQualityIndicator = vi.fn();

vi.mock("@livekit/components-react", () => ({
  useLocalParticipant: (...args: unknown[]) => mockUseLocalParticipant(...args),
  useRemoteParticipants: (...args: unknown[]) =>
    mockUseRemoteParticipants(...args),
  useConnectionQualityIndicator: (...args: unknown[]) =>
    mockUseConnectionQualityIndicator(...args),
}));

import { CallQualityMonitor } from "@/components/consultation/call-quality-monitor";

function makeParticipant(overrides: Record<string, unknown> = {}) {
  return {
    sid: "local-sid",
    identity: "local-user",
    isMicrophoneEnabled: true,
    isCameraEnabled: true,
    ...overrides,
  };
}

describe("CallQualityMonitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConnectionQualityIndicator.mockReturnValue({
      className: "lk-connection-quality",
      quality: ConnectionQuality.Excellent,
    });
  });

  it("renders local participant section with 'You' label", () => {
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant(),
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([]);

    render(<CallQualityMonitor />);
    expect(screen.getByText("You")).toBeDefined();
  });

  it("shows 'Waiting…' when no remote participant", () => {
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant(),
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([]);

    render(<CallQualityMonitor />);
    expect(screen.getByText("Waiting…")).toBeDefined();
  });

  it("renders remote participant section when remote is present", () => {
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant(),
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([
      makeParticipant({ sid: "remote-sid", identity: "remote-user" }),
    ]);

    render(<CallQualityMonitor />);
    expect(screen.getByText("Remote")).toBeDefined();
    expect(screen.queryByText("Waiting…")).toBeNull();
  });

  it("displays mic off icon when local mic is muted", () => {
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant({ isMicrophoneEnabled: false }),
      isMicrophoneEnabled: false,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([]);

    render(<CallQualityMonitor />);
    expect(screen.getByLabelText("Microphone off")).toBeDefined();
  });

  it("displays camera off icon when local camera is disabled", () => {
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant({ isCameraEnabled: false }),
      isMicrophoneEnabled: true,
      isCameraEnabled: false,
    });
    mockUseRemoteParticipants.mockReturnValue([]);

    render(<CallQualityMonitor />);
    expect(screen.getByLabelText("Camera off")).toBeDefined();
  });

  it("displays mic on and camera on icons when enabled", () => {
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant(),
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([]);

    render(<CallQualityMonitor />);
    expect(screen.getByLabelText("Microphone on")).toBeDefined();
    expect(screen.getByLabelText("Camera on")).toBeDefined();
  });

  it("passes participant to useConnectionQualityIndicator for local", () => {
    const localP = makeParticipant();
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: localP,
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([]);

    render(<CallQualityMonitor />);
    expect(mockUseConnectionQualityIndicator).toHaveBeenCalledWith({
      participant: localP,
    });
  });

  it("passes remote participant to useConnectionQualityIndicator", () => {
    const localP = makeParticipant();
    const remoteP = makeParticipant({
      sid: "remote-sid",
      identity: "remote-user",
    });
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: localP,
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([remoteP]);

    render(<CallQualityMonitor />);
    expect(mockUseConnectionQualityIndicator).toHaveBeenCalledWith({
      participant: remoteP,
    });
  });

  it("shows correct signal label for poor quality", () => {
    mockUseConnectionQualityIndicator.mockReturnValue({
      className: "lk-connection-quality",
      quality: ConnectionQuality.Poor,
    });
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant(),
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([]);

    render(<CallQualityMonitor />);
    expect(screen.getByLabelText("Signal poor")).toBeDefined();
  });

  it("shows correct signal label for good quality (Excellent)", () => {
    mockUseConnectionQualityIndicator.mockReturnValue({
      className: "lk-connection-quality",
      quality: ConnectionQuality.Excellent,
    });
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant(),
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([]);

    render(<CallQualityMonitor />);
    expect(screen.getByLabelText("Signal good")).toBeDefined();
  });

  it("shows remote mute status correctly", () => {
    mockUseLocalParticipant.mockReturnValue({
      localParticipant: makeParticipant(),
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    });
    mockUseRemoteParticipants.mockReturnValue([
      makeParticipant({
        sid: "remote-sid",
        isMicrophoneEnabled: false,
        isCameraEnabled: false,
      }),
    ]);

    render(<CallQualityMonitor />);
    const micOffIcons = screen.getAllByLabelText("Microphone off");
    const camOffIcons = screen.getAllByLabelText("Camera off");
    expect(micOffIcons.length).toBe(1);
    expect(camOffIcons.length).toBe(1);
  });
});
