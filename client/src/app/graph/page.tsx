"use client";

import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageBody, PageHeader, LoadingRow, ErrorRow } from "@/components/ui/Page";
import { getGraph, getStats, type GraphData, type GraphStats } from "@/lib/api";

const ReactFlow = dynamic(() => import("reactflow"), { ssr: false });
import "reactflow/dist/style.css";

const nodeColors: Record<string, string> = {
  Note: "oklch(0.62 0.13 240)",
  Concept: "oklch(0.62 0.15 150)",
};

export default function GraphPage() {
  const graph = useQuery({ queryKey: ["graph"], queryFn: () => getGraph(), refetchInterval: 4000 });
  const stats = useQuery({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 4000 });

  return (
    <AppShell>
      <PageBody width="full">
        <PageHeader
          eyebrow="Knowledge graph"
          title="What AEGIS knows."
          meta="Every node is a concept, paper, or note. Every edge is a relationship the agent learned."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 h-[calc(100vh-220px)]">
          <Card className="overflow-hidden">
            <CardBody className="h-full p-0">
              {graph.isLoading && <LoadingRow label="Loading graph" className="p-5" />}
              {graph.error && <ErrorRow className="p-5">Failed: {String(graph.error)}</ErrorRow>}
              {graph.data && graph.data.nodes.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[14px] italic" style={{ color: "var(--color-ink-faint)" }}>
                    Empty graph. Remember a source to populate.
                  </p>
                </div>
              )}
              {graph.data && graph.data.nodes.length > 0 && (
                <Flow data={graph.data} />
              )}
            </CardBody>
          </Card>

          <div className="space-y-4 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Graph health</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {stats.data ? (
                  <>
                    <Row label="Nodes" value={String(stats.data.node_count)} />
                    <Row label="Edges" value={String(stats.data.edge_count)} />
                    <Row label="Datasets" value={String(stats.data.dataset_count)} />
                    <Row label="Memory quality" value={`${(stats.data.memory_quality_score * 100).toFixed(0)}%`} />
                    <div className="pt-2">
                      <div className="eyebrow mb-2">Node types</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(stats.data.node_type_counts).map(([t, c]) => (
                          <Badge key={t} tone="neutral" variant="chip">
                            {t} · {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="eyebrow mb-2">Edge types</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(stats.data.edge_type_counts).map(([t, c]) => (
                          <Badge key={t} tone="accent" variant="chip">
                            {t} · {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px]" style={{ color: "var(--color-ink-muted)" }}>{label}</span>
      <span className="text-[13px] font-mono nums" style={{ color: "var(--color-ink-strong)" }}>{value}</span>
    </div>
  );
}

function Flow({ data }: { data: GraphData }) {
  const { nodes, edges } = useMemo(() => buildLayout(data), [data]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      />
    </div>
  );
}

function buildLayout(data: GraphData) {
  const cx = 360;
  const cy = 240;
  const radius = 200;
  const n = Math.max(data.nodes.length, 1);
  const rfNodes = data.nodes.map((node, i) => {
    const angle = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const color = nodeColors[node.label] ?? "var(--color-ink-muted)";
    return {
      id: node.id,
      position: { x, y },
      data: { label: node.name },
      style: {
        background: "var(--color-surface-2)",
        border: `1.5px solid ${color}`,
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        color: "var(--color-ink-strong)",
        fontFamily: "Geist, system-ui, sans-serif",
        fontWeight: 500,
        minWidth: 90,
        textAlign: "center" as const,
      },
    };
  });
  const rfEdges = data.edges.map((e, i) => ({
    id: `${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    style: { stroke: "var(--color-rule)", strokeWidth: 1 },
    labelStyle: {
      fontSize: 10,
      fill: "var(--color-ink-faint)",
      fontFamily: "Geist Mono, ui-monospace, monospace",
    },
    labelBgStyle: { fill: "var(--color-surface)" },
  }));
  return { nodes: rfNodes, edges: rfEdges };
}
