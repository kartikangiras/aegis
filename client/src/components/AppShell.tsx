"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Network,
  MessageSquare,
  Clock,
  Brain,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Inbox, exact: true },
  { href: "/graph", label: "Knowledge Graph", icon: Network },
  { href: "/chat", label: "Research Chat", icon: MessageSquare },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/memory", label: "Memory Manager", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Persist & sync the dark/light theme toggle */
function useTheme(): [string, (t: string) => void] {
  const [theme, setThemeState] = useState<string>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("aegis-theme") ?? "dark";
    setThemeState(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function setTheme(t: string) {
    setThemeState(t);
    localStorage.setItem("aegis-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }

  return [theme, setTheme];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const routeKey = pageGroupKey(pathname);

  // Close mobile nav on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: "var(--color-bg)", color: "var(--color-ink)" }}
    >
      {/* ── MOBILE TOP BAR ── */}
      <div
        className="lg:hidden flex items-center gap-3 px-4 h-11 shrink-0 border-b"
        style={{
          background: "var(--color-bg)",
          borderColor: "var(--color-rule-soft)",
        }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="p-1.5 -ml-1.5"
          style={{ color: "var(--color-ink-muted)" }}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div
          className="text-[12px] tracking-[0.16em] uppercase truncate"
          style={{
            color: "var(--color-ink-faint)",
            fontFamily: "Geist Mono, ui-monospace, monospace",
          }}
        >
          AEGIS · Memory OS
        </div>
      </div>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden lg:flex w-[224px] shrink-0 flex-col border-r"
        style={{
          background: "var(--color-bg)",
          borderColor: "var(--color-rule-soft)",
        }}
      >
        <Brand />
        <nav className="flex-1 overflow-y-auto px-2.5 pb-3 pt-3 flex flex-col gap-px">
          {nav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <SystemWidget theme={theme} setTheme={setTheme} />
      </aside>

      {/* ── MOBILE NAV DRAWER ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative w-[260px] max-w-[80vw] h-full flex flex-col border-r"
            style={{
              background: "var(--color-bg)",
              borderColor: "var(--color-rule-soft)",
              animation: "aegis-drawer-in 180ms var(--ease-out-quart)",
            }}
          >
            <div
              className="flex items-center justify-between px-3 h-11 shrink-0 border-b"
              style={{ borderColor: "var(--color-rule-soft)" }}
            >
              <div
                className="text-[11px] tracking-[0.18em] uppercase"
                style={{
                  color: "var(--color-ink-faint)",
                  fontFamily: "Geist Mono, ui-monospace, monospace",
                }}
              >
                Menu
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 -mr-1.5"
                style={{ color: "var(--color-ink-muted)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Brand />
            <nav className="flex-1 overflow-y-auto px-2.5 pb-3 pt-2 flex flex-col gap-px">
              {nav.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>
            <SystemWidget theme={theme} setTheme={setTheme} />
          </aside>
        </div>
      )}

      {/* ── MAIN with route-fade animation ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div
          key={routeKey}
          style={{
            animation: "aegis-route-fade 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
            minHeight: "100%",
            willChange: "opacity, transform",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/** Map pathname to a group key so the fade only fires on section changes */
function pageGroupKey(pathname: string): string {
  if (!pathname || pathname === "/") return "home";
  const seg = pathname.split("/")[1];
  return seg || "home";
}

function NavLink({
  item,
  pathname,
  onNav,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; exact?: boolean };
  pathname: string;
  onNav?: () => void;
}) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname?.startsWith(item.href) && item.href !== "/";
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNav}
      className={cn(
        "nav-row group flex items-center gap-3.5 px-3 text-[15px] tracking-[0.003em] min-h-[46px] rounded-md",
        isActive && "nav-row-active font-medium",
      )}
      style={{
        color: isActive ? "var(--color-ink-strong)" : "var(--color-ink-muted)",
        background: isActive ? "var(--color-surface-2)" : "transparent",
      }}
    >
      <span
        className="nav-icon-lucide inline-flex items-center justify-center shrink-0 transition-colors"
        style={{
          width: 28,
          height: 28,
          color: isActive ? "var(--color-accent)" : "var(--color-ink-ghost)",
        }}
      >
        <Icon size={17} strokeWidth={1.5} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function Brand() {
  return (
    <div
      className="px-4 py-4 border-b"
      style={{ borderColor: "var(--color-rule-soft)" }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="h-7 w-7 inline-flex items-center justify-center shrink-0"
          style={{
            background: "var(--color-accent-soft)",
            border: "1px solid var(--color-accent-line)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-accent)",
          }}
        >
          <Circle size={10} strokeWidth={2} fill="var(--color-accent)" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[14px] font-medium tracking-[-0.01em] truncate"
            style={{ color: "var(--color-ink-strong)" }}
          >
            AEGIS
          </div>
          <div
            className="text-[10.5px] tracking-[0.06em] mt-0.5 truncate"
            style={{ color: "var(--color-ink-faint)" }}
          >
            Context Memory AI · AWS
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bottom sidebar widget — initials chip + theme toggle */
function SystemWidget({
  theme,
  setTheme,
}: {
  theme: string;
  setTheme: (t: string) => void;
}) {
  return (
    <div
      className="px-2.5 py-2.5 border-t flex items-center gap-2 shrink-0"
      style={{
        borderColor: "var(--color-rule-soft)",
        background: "var(--color-bg)",
        minHeight: 52,
      }}
    >
      {/* Initials chip */}
      <div className="flex-1 min-w-0 flex items-center gap-2.5 px-1 py-1">
        <div
          className="h-7 w-7 inline-flex items-center justify-center text-[10.5px] tracking-[0.03em] font-medium shrink-0"
          style={{
            background: "var(--color-accent-soft)",
            color: "var(--color-accent)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          AG
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[12.5px] truncate"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Local · InMemory
          </div>
        </div>
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="h-7 w-7 inline-flex items-center justify-center rounded shrink-0 transition-colors"
        style={{ color: "var(--color-ink-ghost)" }}
        title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        aria-label="Toggle theme"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {theme === "dark" ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          <Moon className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
