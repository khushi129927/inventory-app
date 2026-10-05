"use client";

import * as React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { apiGetSession } from "@/lib/api";

function isPublicPath(pathname: string) {
  return pathname === "/offerings" || pathname.startsWith("/o/");
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, setSession } = useAuthStore();
  const isAuthPage = pathname.startsWith("/login");
  const isPublicPage = isPublicPath(pathname);

  useEffect(() => {
    if (isPublicPage) {
      return;
    }

    async function restoreSession() {
      try {
        const { user } = await apiGetSession();
        setSession(user);
      } catch (error) {
        useAuthStore.setState({ isAuthenticated: false, currentUser: null });
      }
    }
    restoreSession();
  }, [isPublicPage, setSession]);

  useEffect(() => {
    if (isPublicPage) {
      return;
    }

    if (!isAuthenticated && !isAuthPage) {
      router.push("/login");
    } else if (isAuthenticated && isAuthPage) {
      router.push("/");
    }
  }, [isAuthenticated, isAuthPage, isPublicPage, pathname, router]);

  if (isPublicPage) return <>{children}</>;
  if (isAuthPage && isAuthenticated) return null;
  if (!isAuthenticated && !isAuthPage) return null;

  return <>{children}</>;
}
