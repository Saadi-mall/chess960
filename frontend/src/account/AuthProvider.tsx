import { useEffect, useState, type ReactNode } from "react";
import { fetchMe, login, logout, register, verifyEmail, type User } from "./api";
import { AuthContext } from "./authContext";

/** Who's signed in. The session itself is an HttpOnly cookie, so the page only ever asks
 * the server; it never sees or stores the token. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then(setUser, () => setUser(null)).finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    signIn: async (email: string, password: string) => setUser(await login(email, password)),
    signUp: (email: string, password: string, displayName: string) => register(email, password, displayName),
    verifyEmail: async (token: string) => setUser(await verifyEmail(token)),
    signOut: async () => {
      await logout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
