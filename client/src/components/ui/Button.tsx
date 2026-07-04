"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "font-medium text-[var(--color-bg)] hover:opacity-90 [background:var(--color-ink-strong)]",
  secondary:
    "text-[var(--color-ink)] hover:text-[var(--color-ink-strong)] " +
    "border border-[var(--color-rule)] hover:border-[var(--color-rule-strong)] " +
    "bg-transparent hover:bg-[var(--color-surface-2)]",
  ghost:
    "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-strong)] " +
    "bg-transparent border border-transparent hover:bg-[var(--color-surface)]",
  accent:
    "font-medium text-[var(--color-accent-ink)] hover:opacity-90 [background:var(--color-accent)]",
  danger:
    "font-medium text-white hover:opacity-90 [background:var(--color-danger)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] tracking-[0.01em]",
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-10 px-5 text-[13.5px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    className,
    children,
    leftIcon,
    rightIcon,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 leading-none",
        "rounded-[4px]",
        "transition-colors duration-150",
        "disabled:opacity-40 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...rest}
    >
      {leftIcon && <span className="-ml-0.5 flex shrink-0">{leftIcon}</span>}
      <span className="truncate">{children}</span>
      {rightIcon && <span className="-mr-0.5 flex shrink-0">{rightIcon}</span>}
    </button>
  );
});
