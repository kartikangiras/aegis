"use client";

import { useQuery } from "@tanstack/react-query";
import { Server, Database, Network, Brain, ShieldCheck, Github, CloudCog, HardDrive, Cpu } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageBody, PageHeader, LoadingRow } from "@/components/ui/Page";
import { getHealth, getStats, type HealthStatus, type GraphStats } from "@/lib/api";

export default function SettingsPage() {
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 5000 });
  const stats = useQuery({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 5000 });

  const isAws = health.data?.backend === "aws";
  const details = health.data?.details ?? {};

  return (
    <AppShell>
      <PageBody width="default">
        <PageHeader
          eyebrow="Settings"
          title="Backend configuration."
          meta="AEGIS is context memory AI built on AWS. The primary backend uses Amazon S3 (raw archival) + DynamoDB (persistent graph) — zero-cost, serverless, no clusters. Set MEMORY_BACKEND=memory for local dev without any infrastructure."
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server size={14} style={{ color: "var(--color-accent)" }} />
              <CardTitle>Backend</CardTitle>
            </div>
            {health.data && <Badge tone={health.data.healthy ? "live" : "danger"} dot variant="chip">
              {health.data.healthy ? "healthy" : "down"}
            </Badge>}
          </CardHeader>
          <CardBody className="space-y-3">
            {health.isLoading && <LoadingRow label="Pinging" />}
            {health.data && (
              <div className="space-y-2.5">
                <Row label="Provider" value={health.data.backend} />
                <Row label="Message" value={health.data.message} />
                <Row label="API base" value="http://localhost:8000" />
                <Row label="Memory" value={String(details?.datasets ?? "—") + " datasets"} />
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── AWS Provider status panel (only shown when backend === "aws") ── */}
        {isAws && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CloudCog size={14} style={{ color: "#FF9900" }} />
                <CardTitle>AWS Provider</CardTitle>
              </div>
              <Badge tone="live" dot variant="chip">active</Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Zero-cost notice */}
              <div
                className="rounded-lg px-3 py-2 text-[12px] leading-[1.6]"
                style={{ background: "color-mix(in srgb, #FF9900 10%, transparent)", color: "var(--color-ink-muted)" }}
              >
                Running on <strong>zero-cost</strong> AWS Free Tier infrastructure — S3 + DynamoDB (always free), no running clusters.
              </div>

              {/* DynamoDB status */}
              <ServiceRow
                icon={<Database size={13} style={{ color: "#6B48FF" }} />}
                label="DynamoDB"
                detail={String(details?.dynamodb_table ?? "aegis-*")}
                status={String(details?.dynamodb ?? "—")}
              />

              {/* S3 status */}
              <ServiceRow
                icon={<HardDrive size={13} style={{ color: "#3F8624" }} />}
                label="S3"
                detail={String(details?.s3_bucket ?? "not configured")}
                status={String(details?.s3 ?? "—")}
              />

              {/* Bedrock status */}
              <ServiceRow
                icon={<Cpu size={13} style={{ color: "#FF9900" }} />}
                label="Bedrock"
                detail={String(details?.bedrock_model ?? "")}
                status={String(details?.bedrock ?? "—")}
              />

              <div className="pt-1 space-y-2.5">
                <Row label="Nodes" value={stats.data ? String(stats.data.node_count) : "—"} />
                <Row label="Edges" value={stats.data ? String(stats.data.edge_count) : "—"} />
                <Row label="Datasets" value={stats.data ? String(stats.data.dataset_count) : "—"} />
              </div>
            </CardBody>
          </Card>
        )}

        {/* ── Generic storage card (non-AWS backends) ── */}
        {!isAws && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database size={14} style={{ color: "var(--color-info)" }} />
                <CardTitle>Storage</CardTitle>
              </div>
              <Badge tone="info" variant="chip">In-process</Badge>
            </CardHeader>
            <CardBody className="space-y-2.5">
              <Row label="Graph" value="— (InMemory uses an in-process graph)" />
              <Row label="Vector store" value="— (keyword recall for the demo)" />
              <Row label="Datasets" value={stats.data ? String(stats.data.dataset_count) : "—"} />
              <Row label="Nodes" value={stats.data ? String(stats.data.node_count) : "—"} />
              <Row label="Edges" value={stats.data ? String(stats.data.edge_count) : "—"} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain size={14} style={{ color: "var(--color-accent)" }} />
              <CardTitle>Memory lifecycle</CardTitle>
            </div>
            <Badge tone="accent" variant="chip">AWS-native</Badge>
          </CardHeader>
          <CardBody>
            <p className="text-[13px] leading-[1.6]" style={{ color: "var(--color-ink-muted)" }}>
              AEGIS exposes a clean memory lifecycle API:
            </p>
            <ul className="mt-3 space-y-2">
              <Endpoint method="POST" path="/api/sources/text" desc="Remember text" />
              <Endpoint method="POST" path="/api/memory/recall" desc="Query memory" />
              <Endpoint method="POST" path="/api/memory/improve" desc="Improve the graph" />
              <Endpoint method="DELETE" path="/api/memory/forget" desc="Forget a dataset" />
              <Endpoint method="GET" path="/api/datasets" desc="List stored datasets" />
              <Endpoint method="GET" path="/api/graph" desc="Inspect the knowledge graph" />
              <Endpoint method="GET" path="/api/stats" desc="Memory statistics" />
            </ul>
          </CardBody>
        </Card>

        {/* ── AWS info card (only shown when NOT on AWS backend) ── */}
        {!isAws && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Network size={14} style={{ color: "var(--color-ink-faint)" }} />
                <CardTitle>AWS Provider</CardTitle>
              </div>
              <Badge tone="neutral" variant="chip">available</Badge>
            </CardHeader>
            <CardBody>
              <p className="text-[13px] leading-[1.6]" style={{ color: "var(--color-ink-muted)" }}>
                Switch to the zero-cost AWS backend (S3 + DynamoDB) by setting{" "}
                <code className="text-[12px] font-mono px-1 py-0.5 rounded" style={{ background: "var(--color-surface-raised)", color: "var(--color-accent)" }}>
                  MEMORY_BACKEND=aws
                </code>{" "}
                in your <code className="text-[12px] font-mono" style={{ color: "var(--color-accent)" }}>server/.env</code>. Datasets and the knowledge graph persist across server restarts. Add a Bedrock model ID to upgrade from keyword recall to Claude-powered answer synthesis.
              </p>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} style={{ color: "var(--color-ink-faint)" }} />
              <CardTitle>About</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-[12.5px] leading-[1.6]" style={{ color: "var(--color-ink-muted)" }}>
              AEGIS v3.0 — Context Memory AI built on AWS.{" "}
              <a
                href="https://github.com/akash-mondal/aegis"
                className="inline-flex items-center gap-1"
                style={{ color: "var(--color-accent)" }}
              >
                <Github size={11} />
                Source
              </a>
            </p>
          </CardBody>
        </Card>
      </PageBody>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px]" style={{ color: "var(--color-ink-muted)" }}>{label}</span>
      <span
        className="text-[12.5px] font-mono"
        style={{ color: "var(--color-ink-strong)" }}
      >
        {value}
      </span>
    </div>
  );
}

function ServiceRow({
  icon,
  label,
  detail,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  status: string;
}) {
  const isOk = status === "ok" || status === "configured";
  const isWarn = status.includes("not configured");
  const tone: "live" | "neutral" | "danger" = isOk ? "live" : isWarn ? "neutral" : "danger";

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium" style={{ color: "var(--color-ink-strong)" }}>
            {label}
          </span>
          <Badge tone={tone} variant="chip" dot={isOk}>
            {status}
          </Badge>
        </div>
        {detail && (
          <p className="text-[11.5px] font-mono mt-0.5 truncate" style={{ color: "var(--color-ink-faint)" }}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const methodColor =
    method === "GET" ? "var(--color-info)" :
    method === "POST" ? "var(--color-accent)" :
    method === "DELETE" ? "var(--color-danger)" :
    "var(--color-ink-muted)";
  return (
    <li className="flex items-center gap-3 text-[12.5px]">
      <span
        className="font-mono uppercase tracking-[0.05em] w-16 shrink-0"
        style={{ color: methodColor }}
      >
        {method}
      </span>
      <span
        className="font-mono"
        style={{ color: "var(--color-ink-strong)" }}
      >
        {path}
      </span>
      <span style={{ color: "var(--color-ink-faint)" }}>— {desc}</span>
    </li>
  );
}
