import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  meta,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      className="flex items-end justify-between gap-6 pb-6 border-b"
      style={{ borderColor: "var(--color-rule-soft)" }}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="eyebrow mb-2.5">{eyebrow}</div>
        )}
        <h1
          className="font-display leading-[1.03] tracking-[-0.018em]"
          style={{
            fontSize: "clamp(2rem, 1.5rem + 1.4vw, 3rem)",
            color: "var(--color-ink-strong)",
          }}
        >
          {title}
        </h1>
        {meta && (
          <div
            className="mt-2.5 text-[13px] leading-relaxed max-w-prose"
            style={{ color: "var(--color-ink-muted)" }}
          >
            {meta}
          </div>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PageBody({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "narrow" | "wide" | "full";
}) {
  const widthClass =
    width === "narrow"
      ? "max-w-3xl"
      : width === "wide"
        ? "max-w-6xl"
        : width === "full"
          ? "max-w-none"
          : "max-w-5xl";
  return (
    <div
      className={cn(
        "mx-auto px-6 md:px-8 py-8 md:py-10 space-y-8",
        widthClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  eyebrow,
  trailing,
  children,
  className,
  divider = false,
}: {
  eyebrow?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  divider?: boolean;
}) {
  return (
    <section className={cn("space-y-3", divider && "pt-4 border-t", className)}
      style={divider ? { borderColor: "var(--color-rule-soft)" } : undefined}
    >
      {(eyebrow || trailing) && (
        <div className="flex items-baseline justify-between">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          {trailing && (
            <div className="text-[11.5px]" style={{ color: "var(--color-ink-ghost)" }}>
              {trailing}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-5">
      {icon && (
        <div
          className="h-12 w-12 inline-flex items-center justify-center"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-rule-soft)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-ink-ghost)",
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <h3
          className="font-display text-[21px] tracking-[-0.012em]"
          style={{ color: "var(--color-ink-strong)" }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="mt-2 text-[13px] leading-[1.6] max-w-md mx-auto"
            style={{ color: "var(--color-ink-muted)" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function LoadingRow({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "py-3 text-[12.5px] tracking-[0.02em]",
        className,
      )}
      style={{ color: "var(--color-ink-faint)" }}
    >
      {label}
      <span className="animate-pulse-dot inline-block ml-[2px]">…</span>
    </div>
  );
}

export function ErrorRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("py-3 text-[12.5px]", className)}
      style={{ color: "var(--color-danger)" }}
    >
      {children}
    </div>
  );
}
