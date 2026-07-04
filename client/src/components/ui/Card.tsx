import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  hover = false,
  lift = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean; lift?: boolean }) {
  if (lift) {
    return (
      <div
        className={cn("case-card", className)}
        {...rest}
      />
    );
  }
  return (
    <div
      className={cn(
        "card-surface",
        hover && "card-surface-hover",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-5 py-4 border-b flex items-center justify-between gap-3",
        className,
      )}
      style={{ borderColor: "var(--color-rule-soft)" }}
      {...rest}
    />
  );
}

export function CardBody({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...rest} />;
}

export function CardTitle({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-[13px] font-medium tracking-[-0.01em]", className)}
      style={{ color: "var(--color-ink-strong)" }}
      {...rest}
    />
  );
}
