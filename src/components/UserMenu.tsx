import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  user: { email: string; name: string; picture: string };
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-xs font-medium text-foreground">{user.name}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{user.email}</span>
      </div>
      <div className="relative">
        <span
          aria-hidden
          className="absolute -inset-[2px] rounded-full bg-gradient-to-br from-[oklch(0.84_0.165_168)] via-[oklch(0.74_0.16_235)] to-[oklch(0.7_0.22_305)] opacity-80 blur-[1px]"
        />
        <img
          src={user.picture}
          alt={user.name}
          className="relative h-8 w-8 rounded-full ring-2 ring-background object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onLogout} title="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
