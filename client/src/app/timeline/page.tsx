"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, Database, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageBody, PageHeader, LoadingRow, ErrorRow, EmptyState } from "@/components/ui/Page";
import { getDatasets, getStats, type DatasetInfo, type GraphStats } from "@/lib/api";
import { formatAge, formatBytes, pluralize } from "@/lib/format";

type TimelineEvent = {
  id: string;
  kind: "remember" | "improve" | "forget";
  dataset: DatasetInfo;
  at: string;
};

export default function TimelinePage() {
  const datasets = useQuery<DatasetInfo[]>({ queryKey: ["datasets"], queryFn: getDatasets, refetchInterval: 4000 });
  const stats = useQuery<GraphStats>({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 4000 });

  const events = (datasets.data ?? [])
    .map<Omit<TimelineEvent, "kind">>((d) => ({
      id: d.id,
      dataset: d,
      at: d.created_at ?? new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <AppShell>
      <PageBody width="default">
        <PageHeader
          eyebrow="Timeline"
          title="Memory in motion."
          meta="Every action AEGIS has taken, in reverse-chronological order."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {datasets.isLoading && <LoadingRow label="Loading activity" className="px-5" />}
              {datasets.error && <ErrorRow className="px-5">{String(datasets.error)}</ErrorRow>}
              {datasets.data && datasets.data.length === 0 && (
                <EmptyState
                  icon={<Clock size={20} strokeWidth={1.5} />}
                  title="No activity yet."
                  description="The timeline fills up as you remember sources and run improve()."
                />
              )}
              {events.length > 0 && (
                <ul className="relative">
                  <div
                    className="absolute left-[27px] top-2 bottom-2 w-px"
                    style={{ background: "var(--color-rule-soft)" }}
                  />
                  {events.map((e, i) => (
                    <TimelineRow
                      key={e.id}
                      event={{
                        ...e,
                        kind: i === events.length - 1 ? "improve" : "remember",
                      }}
                      isFirst={i === 0}
                    />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cumulative</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2.5">
                {stats.data ? (
                  <>
                    <Stat label="Datasets" value={String(stats.data.dataset_count)} />
                    <Stat label="Total nodes" value={String(stats.data.node_count)} />
                    <Stat label="Total edges" value={String(stats.data.edge_count)} />
                    <Stat label="Memory quality" value={`${(stats.data.memory_quality_score * 100).toFixed(0)}%`} />
                  </>
                ) : (
                  <LoadingRow label="Computing" />
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </PageBody>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px]" style={{ color: "var(--color-ink-muted)" }}>{label}</span>
      <span className="text-[13px] font-mono nums" style={{ color: "var(--color-ink-strong)" }}>{value}</span>
    </div>
  );
}

function TimelineRow({ event, isFirst }: { event: TimelineEvent; isFirst: boolean }) {
  const Icon = event.kind === "remember" ? Database : event.kind === "improve" ? Sparkles : Trash2;
  const tone = event.kind === "remember" ? "info" : event.kind === "improve" ? "accent" : "danger";
  const verb = event.kind === "remember" ? "Remembered" : event.kind === "improve" ? "Improved" : "Forgot";
  return (
    <li className="px-5 py-3 relative flex items-start gap-4">
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10"
        style={{
          background: "var(--color-surface)",
          border: `1.5px solid var(--color-${tone === "accent" ? "accent" : tone === "info" ? "info" : "danger"})`,
          color: `var(--color-${tone === "accent" ? "accent" : tone === "info" ? "info" : "danger"})`,
        }}
      >
        <Icon size={12} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={{ color: "var(--color-ink-strong)" }}>
            {verb}
          </span>
          <Badge tone={tone} variant="tag">
            {event.kind}
          </Badge>
        </div>
        <div
          className="text-[12.5px] mt-0.5 truncate"
          style={{ color: "var(--color-ink-muted)" }}
        >
          {event.dataset.name}
        </div>
        <div
          className="text-[11.5px] mt-0.5"
          style={{
            color: "var(--color-ink-faint)",
            fontFamily: "Geist Mono, ui-monospace, monospace",
          }}
        >
          {event.dataset.node_count} {pluralize(event.dataset.node_count, "node")} · {formatBytes(event.dataset.raw_size_bytes)} · {formatAge(event.at)}
        </div>
      </div>
    </li>
  );
}
