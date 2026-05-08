import { Button } from "@/components/ui/button";

interface UserMenuProps {
  user: { email: string; name: string; picture: string };
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={user.picture}
        alt={user.name}
        className="h-8 w-8 rounded-full"
        referrerPolicy="no-referrer"
      />
      <span className="text-sm font-medium">{user.name}</span>
      <Button variant="outline" size="sm" onClick={onLogout}>
        Sign out
      </Button>
    </div>
  );
}
