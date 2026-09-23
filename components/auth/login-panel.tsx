"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import { apiLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPanel() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { user } = await apiLogin(username, password);
      setSession(user);
      toast.success(`Welcome back, ${user.name}!`);
      router.push("/");
    } catch (error: any) {
      toast.error(error.message || "Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 4%, transparent 4%)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[24px] font-bold tracking-tight text-foreground">StockForge</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Inventory Operations Platform
          </p>
          <p className="mx-auto mt-3 max-w-[320px] text-sm text-muted-foreground">
            Sign in to access your workspace, monitor stock, and manage operations across your inventory system.
          </p>
        </div>

        <div className="rounded-[2px] border border-border bg-card p-10 text-foreground shadow-none">
          <h1 className="mb-8 text-[28px] font-bold tracking-tight text-foreground">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]"
              >
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-auto rounded-[4px] border-[#2F476A] bg-white px-3 py-2.5 text-sm text-[#02071A] placeholder:text-[#2F476A] focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-auto rounded-[4px] border-[#2F476A] bg-white px-3 py-2.5 text-sm text-[#02071A] placeholder:text-[#2F476A] focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-auto w-full rounded-[4px] bg-primary py-3 text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 text-[13px] text-muted-foreground">
            <button type="button" className="transition-colors hover:text-foreground">
              Forgot password?
            </button>
            <button type="button" className="transition-colors hover:text-foreground">
              Request access
            </button>
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[11px] text-[var(--text-muted)]">v2.0.0</p>
      </div>
    </div>
  );
}
