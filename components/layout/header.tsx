import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "./logout-button";
import { NotificationBell } from "./notification-bell";

interface HeaderProps {
  userName: string;
  userRole: string;
}

export function Header({ userName, userRole }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{userName}</span>
        <Badge variant="secondary" className="capitalize">
          {userRole}
        </Badge>
        <Separator orientation="vertical" className="h-6" />
        <NotificationBell />
        <LogoutButton />
      </div>
    </header>
  );
}
