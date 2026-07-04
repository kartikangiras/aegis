"use client";

import { useQuery } from "@tanstack/react-query";
import { Server, Database, Network, Brain, ShieldCheck, Github } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageBody, PageHeader, LoadingRow } from "@/components/ui/Page";
import { getHealth, getStats, type HealthStatus, type GraphStats } from "@/lib/api";

export default function SettingsPage() {
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 5000 });
  const stats = useQuery({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 5000 });

  return (
    <AppShell>
      <PageBody width="default">
        <PageHeader
          eyebrow="Settings"
          title="Backend configuration."
          meta="AEGIS is wired to the local FastAPI backend on port 8000. The backend runs an in-memory provider for hackathon demos; Neo4j + Qdrant backends are configured via environment variables."
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
                <Row label="Memory" value={String(health.data.details?.datasets ?? "—") + " datasets"} />
              </div>
            )}
          </CardBody>
        </Card>

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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain size={14} style={{ color: "var(--color-accent)" }} />
              <CardTitle>Memory lifecycle</CardTitle>
            </div>
            <Badge tone="accent" variant="chip">Cognee compatible</Badge>
          </CardHeader>
          <CardBody>
            <p className="text-[13px] leading-[1.6]" style={{ color: "var(--color-ink-muted)" }}>
              The backend exposes the full Cognee memory lifecycle:
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Network size={14} style={{ color: "var(--color-ink-faint)" }} />
              <CardTitle>Future scope · AWS</CardTitle>
            </div>
            <Badge tone="neutral" variant="chip">Planned</Badge>
          </CardHeader>
          <CardBody>
            <p className="text-[13px] leading-[1.6]" style={{ color: "var(--color-ink-muted)" }}>
              Production deployment will swap the in-memory provider for
              Amazon Bedrock (LLM), Neptune (graph), and OpenSearch Serverless
              (vector). The provider interface stays unchanged — only the
              implementation behind it changes.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} style={{ color: "var(--color-ink-faint)" }} />
              <CardTitle>About</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-[12.5px] leading-[1.6]" style={{ color: "var(--color-ink-muted)" }}>
              AEGIS v3.0 — Memory Operating System for AI Research. Built for the
              Cognee Hackathon.{" "}
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
