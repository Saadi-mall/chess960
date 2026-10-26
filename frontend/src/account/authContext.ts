import { createContext, useContext } from "react";
import type { User } from "./api";

export interface AuthValue {
  /** Null for a guest. */
  user: User | null;
  /** True until the first "who am I" check has answered. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// The default is what components see without a provider (e.g. in unit tests): a guest.
export const AuthContext = createContext<AuthValue>({
  user: null,
  loading: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
