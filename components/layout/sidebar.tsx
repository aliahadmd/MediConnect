import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  History,
  Clock,
  Users,
  BarChart3,
  Calendar,
  Stethoscope,
  Settings,
  LayoutDashboard,
  Pill,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navByRole: Record<string, NavItem[]> = {
  patient: [
    {
      label: "Dashboard",
      href: "/patient",
      icon: <LayoutDashboard className="size-4" />,
    },
    {
      label: "Appointments",
      href: "/patient/appointments",
      icon: <CalendarDays className="size-4" />,
    },
    {
      label: "Book Appointment",
      href: "/patient/book",
      icon: <CalendarPlus className="size-4" />,
    },
    {
      label: "Prescriptions",
      href: "/patient/prescriptions",
      icon: <Pill className="size-4" />,
    },
    {
      label: "Timeline",
      href: "/patient/timeline",
      icon: <Clock className="size-4" />,
    },
    {
      label: "Visit History",
      href: "/patient/history",
      icon: <History className="size-4" />,
    },
    {
      label: "Find Doctors",
      href: "/doctors/search",
      icon: <Search className="size-4" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="size-4" />,
    },
  ],
  doctor: [
    {
      label: "Appointments",
      href: "/doctor/appointments",
      icon: <CalendarDays className="size-4" />,
    },
    {
      label: "Availability",
      href: "/doctor/availability",
      icon: <Clock className="size-4" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="size-4" />,
    },
  ],
  admin: [
    {
      label: "Users",
      href: "/admin/users",
      icon: <Users className="size-4" />,
    },
    {
      label: "Appointments",
      href: "/admin/appointments",
      icon: <CalendarDays className="size-4" />,
    },
    {
      label: "Availability",
      href: "/admin/availability",
      icon: <Calendar className="size-4" />,
    },
    {
      label: "Analytics",
      href: "/admin/analytics",
      icon: <BarChart3 className="size-4" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="size-4" />,
    },
  ],
};

interface SidebarProps {
  userName: string;
  userRole: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const items = navByRole[userRole] ?? [];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <Stethoscope className="size-6 text-primary" />
        <span className="text-lg font-semibold">MediConnect</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Dashboard navigation">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
