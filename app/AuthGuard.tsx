"use client";

import * as React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { apiGetSession } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isAuthenticated, setSession } = useAuthStore();

  useEffect(() => {
    async function restoreSession() {
      try {
        const { user } = await apiGetSession();
        setSession(user);
      } catch (error) {
        useAuthStore.setState({ isAuthenticated: false, currentUser: null });
      }
    }
    restoreSession();
  }, [setSession]);

  useEffect(() => {
    const isAuthPage = pathname.startsWith("/login");
    if (!isAuthenticated && !isAuthPage) {
      router.push("/login");
    } else if (isAuthenticated && isAuthPage) {
      router.push("/");
    }
  }, [isAuthenticated, pathname, router]);

  if (pathname.startsWith("/login") && isAuthenticated) return null;
  if (!isAuthenticated && !pathname.startsWith("/login")) return null;

  return <>{children}</>;
}
