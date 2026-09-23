"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import LoginPanel from "@/components/auth/login-panel";

export default function LoginPage() {
  const { currentUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  return <LoginPanel />;
}
