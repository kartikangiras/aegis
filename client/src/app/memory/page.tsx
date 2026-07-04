"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Sparkles, FileText, Link as LinkIcon, Github, Youtube, Upload, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageBody, PageHeader, LoadingRow, ErrorRow, EmptyState } from "@/components/ui/Page";
import {
  forget,
  getDatasets,
  improve,
  rememberText,
  rememberUrl,
  rememberGithub,
  rememberYoutube,
  rememberPdf,
  type DatasetInfo,
} from "@/lib/api";
import { formatAge, formatBytes, pluralize } from "@/lib/format";

type SourceKind = "text" | "url" | "github" | "youtube" | "pdf";

const SOURCE_TABS: { k: SourceKind; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { k: "text", label: "Text", icon: FileText },
  { k: "url", label: "URL", icon: LinkIcon },
  { k: "github", label: "GitHub", icon: Github },
  { k: "youtube", label: "YouTube", icon: Youtube },
  { k: "pdf", label: "PDF", icon: Upload },
];

function urlPlaceholder(kind: SourceKind): string {
  if (kind === "url") return "https://arxiv.org/abs/1706.03762";
  if (kind === "github") return "owner/repo  or  https://github.com/owner/repo";
  if (kind === "youtube") return "https://www.youtube.com/watch?v=…  or  video ID";
  return "";
}

export default function MemoryPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const datasets = useQuery<DatasetInfo[]>({ queryKey: ["datasets"], queryFn: getDatasets, refetchInterval: 4000 });
  const [kind, setKind] = useState<SourceKind>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["datasets"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    qc.invalidateQueries({ queryKey: ["graph"] });
  };

  const rememberMut = useMutation({
    mutationFn: async () => {
      const n = name.trim() || undefined;
      switch (kind) {
        case "text":
          if (!text.trim()) throw new Error("Content is empty.");
          return rememberText(text, n);
        case "url":
          if (!url.trim()) throw new Error("URL is empty.");
          return rememberUrl(url.trim(), n);
        case "github":
          if (!url.trim()) throw new Error("Repository is empty.");
          return rememberGithub(url.trim(), n);
        case "youtube":
          if (!url.trim()) throw new Error("YouTube URL or ID is empty.");
          return rememberYoutube(url.trim(), n);
        case "pdf":
          if (!selectedFile) throw new Error("No PDF selected.");
          return rememberPdf(selectedFile, n || selectedFile.name);
      }
    },
    onSuccess: () => {
      setText("");
      setUrl("");
      setName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      invalidate();
    },
  });

  const improveMut = useMutation({
    mutationFn: () => improve(),
    onSuccess: invalidate,
  });

  const forgetMut = useMutation({
    mutationFn: (id: string) => forget(id),
    onSuccess: invalidate,
  });

  const canSubmit = (() => {
    if (rememberMut.isPending) return false;
    if (kind === "text") return !!text.trim();
    if (kind === "pdf") return !!selectedFile;
    return !!url.trim();
  })();

  return (
    <AppShell>
      <PageBody width="wide">
        <PageHeader
          eyebrow="Memory manager"
          title="The full lifecycle."
          meta="Remember new sources, improve the graph by merging duplicates and strengthening relationships, and forget obsolete datasets."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
          <div className="space-y-4">
            {/* ── Remember ─────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Remember a new source</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Source kind tabs */}
                <div className="grid grid-cols-5 gap-1.5">
                  {SOURCE_TABS.map((opt) => {
                    const Icon = opt.icon;
                    const active = kind === opt.k;
                    return (
                      <button
                        key={opt.k}
                        onClick={() => { setKind(opt.k); setUrl(""); setSelectedFile(null); }}
                        className="h-9 px-2 inline-flex items-center justify-center gap-1.5 rounded-[3px] text-[12px] font-medium transition-colors"
                        style={{
                          background: active ? "var(--color-surface-2)" : "transparent",
                          color: active ? "var(--color-ink-strong)" : "var(--color-ink-muted)",
                          border: `1px solid ${active ? "var(--color-rule)" : "var(--color-rule-soft)"}`,
                        }}
                      >
                        <Icon size={12} strokeWidth={1.6} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Input area */}
                {kind === "text" && (
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={10}
                    placeholder="Paste a research paper, notes, documentation…"
                    className="w-full resize-none text-[13px] leading-[1.6] p-3 rounded-[3px]"
                    style={{
                      background: "var(--color-surface-2)",
                      color: "var(--color-ink)",
                      border: "1px solid var(--color-rule)",
                    }}
                  />
                )}

                {(kind === "url" || kind === "github" || kind === "youtube") && (
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={urlPlaceholder(kind)}
                    className="w-full h-10 px-3 text-[13px] rounded-[3px]"
                    style={{
                      background: "var(--color-surface-2)",
                      color: "var(--color-ink)",
                      border: "1px solid var(--color-rule)",
                    }}
                  />
                )}

                {kind === "pdf" && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-[3px] transition-colors"
                      style={{
                        background: "var(--color-surface-2)",
                        border: `1.5px dashed ${selectedFile ? "var(--color-accent)" : "var(--color-rule)"}`,
                        color: selectedFile ? "var(--color-accent)" : "var(--color-ink-muted)",
                      }}
                    >
                      <Upload size={18} strokeWidth={1.5} />
                      <span className="text-[12.5px]">
                        {selectedFile ? selectedFile.name : "Click to select a PDF"}
                      </span>
                      {selectedFile && (
                        <span className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                          {formatBytes(selectedFile.size)}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* Optional dataset name */}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dataset name (optional)"
                  className="w-full h-9 px-3 text-[12.5px] rounded-[3px]"
                  style={{
                    background: "var(--color-surface-2)",
                    color: "var(--color-ink)",
                    border: "1px solid var(--color-rule)",
                  }}
                />

                {/* Errors / success */}
                {rememberMut.error && (
                  <div
                    className="text-[12px] flex items-center gap-2 p-2.5 rounded-[3px]"
                    style={{
                      background: "var(--color-danger-soft)",
                      color: "var(--color-danger)",
                    }}
                  >
                    <AlertCircle size={12} />
                    {String(rememberMut.error)}
                  </div>
                )}

                {rememberMut.data && (
                  <div
                    className="text-[12px] p-2.5 rounded-[3px]"
                    style={{
                      background: "var(--color-accent-soft)",
                      color: "var(--color-accent)",
                      border: "1px solid var(--color-accent-line)",
                    }}
                  >
                    Remembered as <span className="font-mono">{rememberMut.data.dataset_id}</span>
                  </div>
                )}

                <Button
                  variant="accent"
                  size="lg"
                  onClick={() => rememberMut.mutate()}
                  disabled={!canSubmit}
                  leftIcon={<Plus size={14} />}
                >
                  {rememberMut.isPending ? "Remembering…" : "Remember"}
                </Button>
              </CardBody>
            </Card>

            {/* ── Improve ──────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Improve</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-[12.5px] leading-[1.55]" style={{ color: "var(--color-ink-muted)" }}>
                  Merge duplicate concepts, build ontology, and strengthen
                  relationships across all datasets.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => improveMut.mutate()}
                  disabled={improveMut.isPending}
                  leftIcon={<Sparkles size={14} />}
                >
                  {improveMut.isPending ? "Improving…" : "Run improve()"}
                </Button>
                {improveMut.data && (
                  <p className="text-[12.5px] italic" style={{ color: "var(--color-accent)" }}>
                    {improveMut.data.message}
                  </p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── Dataset list ─────────────────────────────────────── */}
          <div>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Stored datasets</CardTitle>
                  <p className="text-[11.5px] mt-1" style={{ color: "var(--color-ink-faint)" }}>
                    {datasets.data
                      ? `${datasets.data.length} ${pluralize(datasets.data.length, "dataset")} in memory`
                      : "loading…"}
                  </p>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {datasets.isLoading && <LoadingRow label="Loading datasets" className="px-5" />}
                {datasets.error && <ErrorRow className="px-5">{String(datasets.error)}</ErrorRow>}
                {datasets.data && datasets.data.length === 0 && (
                  <EmptyState
                    icon={<FileText size={20} strokeWidth={1.5} />}
                    title="No datasets yet."
                    description="Remember a source from the left panel to start."
                  />
                )}
                {datasets.data && datasets.data.length > 0 && (
                  <ul className="divide-y" style={{ borderColor: "var(--color-rule-soft)" }}>
                    {datasets.data.map((d) => (
                      <li
                        key={d.id}
                        className="px-5 py-3.5 flex items-center gap-3"
                        style={{ borderColor: "var(--color-rule-soft)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-[13.5px] truncate"
                            style={{ color: "var(--color-ink-strong)" }}
                          >
                            {d.name}
                          </div>
                          <div
                            className="text-[11.5px] mt-0.5 truncate"
                            style={{
                              color: "var(--color-ink-faint)",
                              fontFamily: "Geist Mono, ui-monospace, monospace",
                            }}
                          >
                            {d.id} · {d.node_count} {pluralize(d.node_count, "node")} · {formatBytes(d.raw_size_bytes)} · {formatAge(d.created_at)}
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => forgetMut.mutate(d.id)}
                          disabled={forgetMut.isPending}
                          leftIcon={<Trash2 size={12} />}
                        >
                          Forget
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </PageBody>
    </AppShell>
  );
}
