import { create } from "zustand";
import type { User } from "@/app/types/inventory";

export type AuthUser = Pick<User, "id" | "name" | "username" | "role">;

interface AuthState {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  setSession: (user) => set({ currentUser: user, isAuthenticated: true }),
  logout: () => set({ currentUser: null, isAuthenticated: false }),
}));
