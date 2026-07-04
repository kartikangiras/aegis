import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "warning" | "danger" | "info" | "live";
type Variant = "tag" | "chip";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  variant?: Variant;
}

const TONE_FG: Record<Tone, string> = {
  neutral: "var(--color-ink-muted)",
  accent: "var(--color-accent)",
  warning: "var(--color-amber)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
  live: "var(--color-accent)",
};

const TONE_CHIP_BG: Record<Tone, string> = {
  neutral: "color-mix(in oklch, var(--color-ink-muted) 12%, transparent)",
  accent: "var(--color-accent-soft)",
  warning: "var(--color-amber-soft)",
  danger: "var(--color-danger-soft)",
  info: "var(--color-info-soft)",
  live: "var(--color-accent-soft)",
};

export function Badge({
  className,
  tone = "neutral",
  dot = false,
  variant = "tag",
  children,
  style,
  ...rest
}: BadgeProps) {
  const isChip = variant === "chip";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 leading-none uppercase",
        isChip
          ? "px-2 py-[3px] text-[10px] tracking-[0.10em] font-medium rounded-[3px]"
          : "text-[10px] tracking-[0.13em] font-semibold",
        className,
      )}
      style={{
        color: TONE_FG[tone],
        background: isChip ? TONE_CHIP_BG[tone] : "transparent",
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          className={cn(
            "h-[5px] w-[5px] rounded-full shrink-0",
            tone === "live" && "animate-pulse-dot",
          )}
          style={{ background: TONE_FG[tone] }}
        />
      )}
      {children}
    </span>
  );
}
