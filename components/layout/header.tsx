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
    <header data-testid="header" className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{userName}</span>
        <Badge variant="secondary" className="capitalize text-xs font-semibold px-3 py-1">
          {userRole}
        </Badge>
        <Separator orientation="vertical" className="h-6" />
        <NotificationBell />
        <LogoutButton />
      </div>
    </header>
  );
}
