"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyStateIllustration } from "@/components/illustrations";

interface DoctorProfile {
  specialization: string | null;
  qualifications: string | null;
  bio: string | null;
  phone: string | null;
  consultationFee: string | null;
  yearsOfExperience: number | null;
}

interface PatientProfile {
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodType: string | null;
  allergies: string | null;
  medicalHistoryNotes: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "patient" | "doctor" | "admin";
  isActive: boolean;
  createdAt: string;
  doctorProfile: DoctorProfile | null;
  patientProfile: PatientProfile | null;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

function ProfileField({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="text-sm">{String(value)}</p>
    </div>
  );
}

function DoctorProfileDetails({ profile }: { profile: DoctorProfile }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <ProfileField label="Specialization" value={profile.specialization} />
      <ProfileField label="Qualifications" value={profile.qualifications} />
      <ProfileField label="Bio" value={profile.bio} />
      <ProfileField label="Phone" value={profile.phone} />
      <ProfileField label="Consultation Fee" value={profile.consultationFee ? `$${profile.consultationFee}` : null} />
      <ProfileField label="Years of Experience" value={profile.yearsOfExperience} />
    </div>
  );
}

function PatientProfileDetails({ profile }: { profile: PatientProfile }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <ProfileField label="Date of Birth" value={profile.dateOfBirth} />
      <ProfileField label="Gender" value={profile.gender} />
      <ProfileField label="Phone" value={profile.phone} />
      <ProfileField label="Address" value={profile.address} />
      <ProfileField label="Emergency Contact" value={profile.emergencyContactName} />
      <ProfileField label="Emergency Phone" value={profile.emergencyContactPhone} />
      <ProfileField label="Blood Type" value={profile.bloodType} />
      <ProfileField label="Allergies" value={profile.allergies} />
      <ProfileField label="Medical History Notes" value={profile.medicalHistoryNotes} />
    </div>
  );
}

export function UserTable() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (role !== "all") params.set("role", role);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const json: UsersResponse = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleToggleActive(userId: string, currentlyActive: boolean) {
    setToggling(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: currentlyActive ? "deactivate" : "activate",
        }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } finally {
      setToggling(null);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleRoleChange(value: string) {
    setRole(value);
    setPage(1);
  }

  function toggleExpand(userId: string) {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  }

  function hasProfile(user: User): boolean {
    return user.doctorProfile !== null || user.patientProfile !== null;
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
        <Select value={role} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="patient">Patient</SelectItem>
            <SelectItem value="doctor">Doctor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : data && data.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8">
                  <div className="flex flex-col items-center gap-3 text-center" data-testid="empty-admin-users">
                    <EmptyStateIllustration size={96} decorative className="text-muted-foreground/60" />
                    <div className="space-y-1">
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm text-muted-foreground max-w-sm">Users will appear here as they register on the platform</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  expanded={expandedUserId === user.id}
                  onToggleExpand={() => toggleExpand(user.id)}
                  onToggleActive={() => handleToggleActive(user.id, user.isActive)}
                  toggling={toggling === user.id}
                  hasProfile={hasProfile(user)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.total ?? 0} users)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  expanded,
  onToggleExpand,
  onToggleActive,
  toggling,
  hasProfile,
}: {
  user: User;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  toggling: boolean;
  hasProfile: boolean;
}) {
  return (
    <>
      <TableRow className={hasProfile ? "cursor-pointer" : ""} onClick={hasProfile ? onToggleExpand : undefined}>
        <TableCell className="w-8 text-center">
          {hasProfile && (
            <span className="inline-block transition-transform text-muted-foreground" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
              ▶
            </span>
          )}
        </TableCell>
        <TableCell className="font-medium">{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Badge variant="outline" className="capitalize">
            {user.role}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={user.isActive ? "default" : "destructive"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
        </TableCell>
        <TableCell>
          <Button
            variant={user.isActive ? "destructive" : "default"}
            size="sm"
            disabled={toggling}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
          >
            {toggling
              ? "Updating…"
              : user.isActive
                ? "Deactivate"
                : "Activate"}
          </Button>
        </TableCell>
      </TableRow>
      {expanded && hasProfile && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/50 p-4">
            <div className="pl-8">
              <h4 className="text-sm font-semibold mb-3">
                {user.role === "doctor" ? "Doctor Profile" : "Patient Profile"}
              </h4>
              {user.doctorProfile && <DoctorProfileDetails profile={user.doctorProfile} />}
              {user.patientProfile && <PatientProfileDetails profile={user.patientProfile} />}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
