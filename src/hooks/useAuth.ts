import { useCallback } from "react";
import { authClient } from "../auth/auth-client";

interface User {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  login: () => void;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const { data: session, isPending } = authClient.useSession();

  const login = useCallback(() => {
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();
  }, []);

  const user: User | null = session?.user
    ? {
        email: session.user.email,
        name: session.user.name,
        picture: session.user.image ?? "",
      }
    : null;

  return {
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    user,
    login,
    logout,
  };
}
