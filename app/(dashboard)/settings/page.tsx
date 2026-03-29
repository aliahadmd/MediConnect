import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, doctorProfiles, patientProfiles } from "@/lib/db/schema";
import { DoctorProfileForm } from "@/components/profiles/doctor-profile-form";
import { PatientProfileForm } from "@/components/profiles/patient-profile-form";
import { PhotoUpload } from "@/components/profiles/photo-upload";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { User, Stethoscope, HeartPulse, Camera, Bell } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as Record<string, unknown>).role as string;
  const userName = session.user.name ?? "User";
  const userEmail = session.user.email ?? "";

  let doctorProfile = null;
  let patientProfile = null;

  if (userRole === "doctor") {
    const [profile] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, session.user.id));
    doctorProfile = profile ?? null;
  } else if (userRole === "patient") {
    const [profile] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, session.user.id));
    patientProfile = profile ?? null;
  }

  // Fetch current profile photo URL
  let currentPhotoUrl: string | null = null;
  const [userRecord] = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, session.user.id));
  if (userRecord?.image) {
    try {
      currentPhotoUrl = await getProfilePhotoUrl(userRecord.image);
    } catch {
      // MinIO unavailable — leave photo URL null
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div data-testid="settings-header">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      {/* Personal Info Section */}
      <Card className="p-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-6 w-6" />
            <CardTitle className="font-semibold">Personal Information</CardTitle>
          </div>
          <CardDescription>
            Your basic account information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Name</span>
            <span className="text-sm">{userName}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Email</span>
            <span className="text-sm">{userEmail}</span>
          </div>
        </CardContent>
      </Card>

      {/* Professional / Medical Info Section */}
      {userRole === "doctor" && (
        <Card className="p-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-6 w-6" />
              <CardTitle className="font-semibold">Professional Information</CardTitle>
            </div>
            <CardDescription>
              Update your specialization, qualifications, and consultation details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DoctorProfileForm initialData={doctorProfile} />
          </CardContent>
        </Card>
      )}

      {userRole === "patient" && (
        <Card className="p-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HeartPulse className="h-6 w-6" />
              <CardTitle className="font-semibold">Medical Information</CardTitle>
            </div>
            <CardDescription>
              Update your medical details and emergency contact information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientProfileForm initialData={patientProfile} />
          </CardContent>
        </Card>
      )}

      {/* Photo Upload Section */}
      <Card className="p-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6" />
            <CardTitle className="font-semibold">Profile Photo</CardTitle>
          </div>
          <CardDescription>
            Upload a profile photo so others can identify you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div data-testid="settings-photo-upload">
            <PhotoUpload currentPhotoUrl={currentPhotoUrl} />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences Section */}
      <Card className="p-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            <CardTitle className="font-semibold">Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Control which notifications you receive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferences />
        </CardContent>
      </Card>
    </div>
  );
}
