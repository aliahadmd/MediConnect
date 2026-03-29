export interface IllustrationProps {
  className?: string;
  size?: number; // width & height in px, default 200
  decorative?: boolean; // when true, sets aria-hidden="true"; when false, renders <title>
  title?: string; // accessible title text (used when decorative=false)
}

export { StethoscopeIllustration } from "./stethoscope-illustration";
export { HeartbeatIllustration } from "./heartbeat-illustration";
export { PillsIllustration } from "./pills-illustration";
export { CalendarIllustration } from "./calendar-illustration";
export { VideoCallIllustration } from "./video-call-illustration";
export { DoctorIllustration } from "./doctor-illustration";
export { PatientIllustration } from "./patient-illustration";
export { ShieldIllustration } from "./shield-illustration";
export { AnalyticsIllustration } from "./analytics-illustration";
export { EmptyStateIllustration } from "./empty-state-illustration";
export { WaitingIllustration } from "./waiting-illustration";
export { ConsultationCompleteIllustration } from "./consultation-complete-illustration";
export { ConnectionErrorIllustration } from "./connection-error-illustration";
export { HeroIllustration } from "./hero-illustration";
