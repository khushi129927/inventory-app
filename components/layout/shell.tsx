"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { cn, copyToClipboard } from "@/lib/utils";
import { useInventoryUIStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserRole } from "@/app/types/inventory";
import LoginPanel from "@/components/auth/login-panel";
import Icon from "@/components/Icon";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  section: "Workspace";
}

interface SidebarContentProps {
  navItems: NavItem[];
  userRole: UserRole;
  onNavigate?: () => void;
  pendingCount?: number;
}

const allNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard", section: "Workspace" },
  { label: "Stock", href: "/products", icon: "Package", section: "Workspace" },
  { label: "Movements", href: "/movements", icon: "ArrowLeftRight", section: "Workspace" },
  { label: "Orders", href: "/orders", icon: "ClipboardList", section: "Workspace" },
  { label: "Outstanding", href: "/outstanding", icon: "Wallet", section: "Workspace" },
  { label: "Categories", href: "/categories", icon: "Tags", section: "Workspace" },
  { label: "Users", href: "/users", icon: "Users", section: "Workspace" },
];

const roleNavAccess: Record<UserRole, string[]> = {
  admin: ["/", "/products", "/movements", "/categories", "/users", "/orders", "/outstanding"],
  manager: ["/", "/products", "/movements", "/orders", "/outstanding"],
  executive: ["/", "/products"],
};

function getNavItemsForRole(role: UserRole): NavItem[] {
  const allowed = roleNavAccess[role] ?? [];
  return allNavItems.filter((item) => allowed.includes(item.href));
}

function getActiveNavItem(pathname: string, navItems: NavItem[]): NavItem | undefined {
  const exactMatch = navItems.find((item) => pathname === item.href);
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatches = navItems.filter(
    (item) => item.href !== "/" && pathname.startsWith(`${item.href}/`)
  );
  if (prefixMatches.length > 0) {
    return prefixMatches.reduce((longest, item) =>
      item.href.length > longest.href.length ? item : longest
    );
  }

  return undefined;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavLink({
  item,
  activeHref,
  onNavigate,
}: {
  item: NavItem;
  activeHref?: string;
  onNavigate?: () => void;
}) {
  const isActive = item.href === activeHref;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "border-l-[3px] border-l-[var(--sidebar-primary)] bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]"
          : "border-l-[3px] border-l-transparent text-[rgba(232,236,242,0.55)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--sidebar-foreground)]"
      )}
    >
      <Icon
        name={item.icon as never}
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-[var(--sidebar-foreground)]" : "text-muted-foreground"
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarSection({
  title,
  items,
  activeHref,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  activeHref?: string;
  onNavigate?: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="px-6 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--sidebar-foreground)]/60">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} activeHref={activeHref} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function SidebarContent({
  navItems,
  userRole,
  onNavigate,
  pendingCount,
}: SidebarContentProps) {
  const pathname = usePathname();
  const [catalogUrl, setCatalogUrl] = React.useState("");

  React.useEffect(() => {
    setCatalogUrl(`${window.location.origin}/offerings`);
  }, []);

  const workspaceItems = React.useMemo(
    () => navItems.filter((item) => item.section === "Workspace"),
    [navItems]
  );
  const canShareCatalog = userRole === "admin" || userRole === "manager";
  const canSeeSettings = userRole === "admin";
  const isSettingsActive = pathname === "/settings" || pathname.startsWith("/settings/");
  const activeHref = getActiveNavItem(pathname, navItems)?.href;

  const handleCopyCatalog = React.useCallback(async () => {
    const url = catalogUrl || `${window.location.origin}/offerings`;

    try {
      await copyToClipboard(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [catalogUrl]);

  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)] pb-6 text-[var(--sidebar-foreground)]">
      <div className="border-b border-[var(--sidebar-border)] px-6 pt-4 pb-4">
        <div className="space-y-1">
          <p className="text-[18px] font-bold tracking-[-0.02em] text-[var(--sidebar-foreground)]">StockForge</p>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--sidebar-foreground)]/60">
            Inventory Command Center
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-6">
        <SidebarSection title="Workspace" items={workspaceItems} activeHref={activeHref} onNavigate={onNavigate} />
      </div>

      <div className="mt-auto space-y-3 px-6">
        {canSeeSettings && (
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors -mx-6",
              isSettingsActive
                ? "border-l-[3px] border-l-[var(--sidebar-primary)] bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]"
                : "border-l-[3px] border-l-transparent text-[rgba(232,236,242,0.55)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--sidebar-foreground)]"
            )}
          >
            <Icon
              name="Settings"
              className={cn(
                "h-4 w-4 shrink-0",
                isSettingsActive ? "text-[var(--sidebar-foreground)]" : "text-[rgba(232,236,242,0.55)]"
              )}
            />
            <span>Settings</span>
          </Link>
        )}

        {canShareCatalog && (
          <div className="rounded-[8px] border border-[var(--sidebar-border)] bg-[rgba(255,255,255,0.04)] p-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--sidebar-foreground)]">Catalog copy</p>
              <p className="mt-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--sidebar-foreground)]/60">
                Public Offerings
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="max-w-[140px] truncate text-[11px] text-[var(--sidebar-foreground)]/60">
                {catalogUrl || "/offerings"}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyCatalog}
                aria-label="Copy catalog link"
                className="h-7 w-7 rounded-[6px] border border-[rgba(255,255,255,0.14)] bg-transparent text-[var(--sidebar-foreground)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--sidebar-foreground)]"
              >
                <Icon name="Copy" className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function isPublicShellPath(pathname: string) {
  return pathname === "/offerings" || pathname.startsWith("/o/");
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicShellPath(pathname);

  // Use a safe check to prevent the app from crashing if the store is temporarily undefined
  const currentUser = typeof useAuthStore !== 'undefined' ? useAuthStore((state) => state.currentUser) : null;
  const logout = typeof useAuthStore !== 'undefined' ? useAuthStore((state) => state.logout) : () => {};

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const pendingCount = 0; // Will connect to API later
  const canSeeOrders = currentUser?.role === "admin" || currentUser?.role === "manager";
  const notificationCount = canSeeOrders ? pendingCount : 0;

  if (isPublic && !currentUser) {
    return <>{children}</>;
  }

  if (!currentUser) {
    return <LoginPanel />;
  }

  const visibleNavItems = getNavItemsForRole(currentUser.role);
  const userInitials = getInitials(currentUser.name);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden h-screen w-64 shrink-0 overflow-hidden md:block">
        <SidebarContent
          navItems={visibleNavItems}
          userRole={currentUser.role}
          pendingCount={notificationCount}
        />
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-14 border-b border-border bg-card px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open menu"
                  className="rounded-sm border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Icon name="Menu" className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[260px] border-r border-border bg-card p-0 text-foreground sm:max-w-[260px]"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <SidebarContent
                  navItems={visibleNavItems}
                  userRole={currentUser.role}
                  onNavigate={() => setMobileOpen(false)}
                  pendingCount={notificationCount}
                />
              </SheetContent>
            </Sheet>
          </div>

          <div className="ml-auto flex items-center gap-4 self-center">
            {!!notificationCount && notificationCount > 0 && (
              <Link
                href="/orders"
                className="relative flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`${notificationCount} pending orders`}
              >
                <Icon name="Bell" className="h-4 w-4" />
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9BD7EC] px-1 text-[10px] font-bold text-[#02071A]">
                  {notificationCount}
                </span>
              </Link>
            )}

            <p className="hidden font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:block">
              {currentUser.name}
            </p>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={logout}
              className="rounded-[6px] border border-border bg-transparent px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon name="LogOut" className="h-3.5 w-3.5" />
              Logout
            </Button>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sidebar)] font-mono text-[12px] font-bold uppercase text-[var(--sidebar-foreground)]">
              {userInitials}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
