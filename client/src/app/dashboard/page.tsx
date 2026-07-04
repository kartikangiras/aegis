"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Activity, Database, FileText, Network, Plus, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageBody, PageHeader, Section, LoadingRow, ErrorRow, EmptyState } from "@/components/ui/Page";
import { getDatasets, getHealth, getStats, type DatasetInfo, type GraphStats, type HealthStatus } from "@/lib/api";
import { formatAge, formatBytes, pluralize } from "@/lib/format";

export default function DashboardPage() {
  const health = useQuery<HealthStatus>({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 5000 });
  const stats = useQuery<GraphStats>({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 3000 });
  const datasets = useQuery<DatasetInfo[]>({ queryKey: ["datasets"], queryFn: getDatasets, refetchInterval: 5000 });

  return (
    <AppShell>
      <PageBody width="wide">
        <PageHeader
          eyebrow="Workspace"
          title="Memory dashboard."
          meta="A live read of everything AEGIS has remembered. Ingest a source to start building your graph."
          actions={
            <Link href="/memory">
              <Button variant="accent" leftIcon={<Plus size={14} />}>
                Remember something
              </Button>
            </Link>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Database size={16} strokeWidth={1.6} />}
            label="Datasets"
            value={stats.data ? String(stats.data.dataset_count) : "—"}
            sub={stats.data ? pluralize(stats.data.dataset_count, "memory") : "loading…"}
            tone="accent"
          />
          <StatCard
            icon={<Network size={16} strokeWidth={1.6} />}
            label="Concepts"
            value={stats.data ? String(stats.data.node_count) : "—"}
            sub="graph nodes"
            tone="info"
          />
          <StatCard
            icon={<Activity size={16} strokeWidth={1.6} />}
            label="Relationships"
            value={stats.data ? String(stats.data.edge_count) : "—"}
            sub="graph edges"
            tone="neutral"
          />
          <StatCard
            icon={<FileText size={16} strokeWidth={1.6} />}
            label="Memory quality"
            value={stats.data ? `${(stats.data.memory_quality_score * 100).toFixed(0)}%` : "—"}
            sub="density + coverage"
            tone="live"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recent memory</CardTitle>
                  <p
                    className="text-[11.5px] mt-1"
                    style={{ color: "var(--color-ink-faint)" }}
                  >
                    Datasets you've ingested, newest first
                  </p>
                </div>
                <Link href="/memory">
                  <Button variant="ghost" size="sm">
                    Manage
                  </Button>
                </Link>
              </CardHeader>
              <CardBody className="p-0">
                {datasets.isLoading && <LoadingRow label="Loading memory" className="px-5" />}
                {datasets.error && (
                  <ErrorRow className="px-5">
                    Couldn't load datasets: {String(datasets.error)}
                  </ErrorRow>
                )}
                {datasets.data && datasets.data.length === 0 && (
                  <EmptyState
                    icon={<Database size={20} strokeWidth={1.5} />}
                    title="No memory yet."
                    description="Upload a research artifact in the Memory Manager to start building the graph."
                    action={
                      <Link href="/memory">
                        <Button variant="primary" leftIcon={<Plus size={14} />}>
                          Add a source
                        </Button>
                      </Link>
                    }
                  />
                )}
                {datasets.data && datasets.data.length > 0 && (
                  <ul className="divide-y" style={{ borderColor: "var(--color-rule-soft)" }}>
                    {datasets.data.slice(0, 6).map((d) => (
                      <DatasetRow key={d.id} dataset={d} />
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Graph composition</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {stats.data ? (
                  <>
                    {Object.entries(stats.data.node_type_counts).map(([type, count]) => (
                      <CompositionBar
                        key={type}
                        label={type}
                        value={count}
                        max={stats.data!.node_count || 1}
                      />
                    ))}
                    {Object.keys(stats.data.node_type_counts).length === 0 && (
                      <p className="text-[12.5px] italic" style={{ color: "var(--color-ink-faint)" }}>
                        Empty graph — remember a source to populate.
                      </p>
                    )}
                  </>
                ) : (
                  <LoadingRow label="Loading graph" />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backend</CardTitle>
              </CardHeader>
              <CardBody>
                {health.data ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px]" style={{ color: "var(--color-ink-muted)" }}>Status</span>
                      <Badge tone={health.data.healthy ? "live" : "danger"} dot variant="chip">
                        {health.data.healthy ? "healthy" : "down"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px]" style={{ color: "var(--color-ink-muted)" }}>Provider</span>
                      <span
                        className="text-[12.5px] font-mono"
                        style={{ color: "var(--color-ink-strong)" }}
                      >
                        {health.data.backend}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px]" style={{ color: "var(--color-ink-muted)" }}>Message</span>
                      <span className="text-[12.5px] font-mono" style={{ color: "var(--color-ink-faint)" }}>
                        {health.data.message}
                      </span>
                    </div>
                  </div>
                ) : (
                  <LoadingRow label="Pinging" />
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        <Section eyebrow="Quick start">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickAction
              href="/memory"
              title="Remember a source"
              body="Paste text, point to a URL, drop a PDF. The graph builds itself."
            />
            <QuickAction
              href="/chat"
              title="Ask a research question"
              body="Query memory across every dataset. Cited answers, no keyword matching."
            />
            <QuickAction
              href="/graph"
              title="Explore the graph"
              body="Visualize what AEGIS knows. Zoom, filter, inspect each node."
            />
          </div>
        </Section>
      </PageBody>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "accent" | "info" | "neutral" | "live";
}) {
  const color =
    tone === "accent" ? "var(--color-accent)" :
    tone === "info" ? "var(--color-info)" :
    tone === "live" ? "var(--color-accent)" :
    "var(--color-ink-strong)";
  return (
    <Card lift>
      <CardBody className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{label}</span>
          <span style={{ color }}>{icon}</span>
        </div>
        <div
          className="font-display text-[34px] tracking-[-0.025em] leading-none nums"
          style={{ color: "var(--color-ink-strong)" }}
        >
          {value}
        </div>
        <div className="text-[11px] tracking-[0.05em] uppercase" style={{ color: "var(--color-ink-faint)" }}>
          {sub}
        </div>
      </CardBody>
    </Card>
  );
}

function DatasetRow({ dataset }: { dataset: DatasetInfo }) {
  return (
    <li className="px-5 py-3.5 flex items-center gap-4" style={{ borderColor: "var(--color-rule-soft)" }}>
      <div className="flex-1 min-w-0">
        <div
          className="text-[13.5px] tracking-[-0.005em] truncate"
          style={{ color: "var(--color-ink-strong)" }}
        >
          {dataset.name}
        </div>
        <div
          className="text-[11.5px] mt-0.5 truncate"
          style={{ color: "var(--color-ink-faint)", fontFamily: "Geist Mono, ui-monospace, monospace" }}
        >
          {dataset.id.slice(0, 8)}… · {dataset.node_count} {pluralize(dataset.node_count, "node")} · {formatBytes(dataset.raw_size_bytes)}
        </div>
      </div>
      <div className="text-[11.5px] tracking-[0.04em] shrink-0" style={{ color: "var(--color-ink-faint)" }}>
        {formatAge(dataset.created_at)}
      </div>
    </li>
  );
}

function CompositionBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12.5px]" style={{ color: "var(--color-ink-muted)" }}>{label}</span>
        <span className="text-[12.5px] nums" style={{ color: "var(--color-ink-strong)" }}>{value}</span>
      </div>
      <div
        className="h-[3px] rounded-full overflow-hidden"
        style={{ background: "var(--color-rule-soft)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: "var(--color-accent)",
            transition: "width 240ms var(--ease-out-quart)",
          }}
        />
      </div>
    </div>
  );
}

function QuickAction({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="case-card p-5 block"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className="text-[14px] font-medium tracking-[-0.005em]"
          style={{ color: "var(--color-ink-strong)" }}
        >
          {title}
        </div>
        <span
          className="text-[11px] mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          →
        </span>
      </div>
      <p className="text-[12.5px] leading-[1.55]" style={{ color: "var(--color-ink-muted)" }}>
        {body}
      </p>
    </Link>
  );
}
