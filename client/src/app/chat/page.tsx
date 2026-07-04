"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/Page";
import { recall, type RecallResult } from "@/lib/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  result?: RecallResult;
  error?: string;
  loading?: boolean;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function ask() {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    const aId = crypto.randomUUID();
    setMessages((m) => [...m, { id: aId, role: "assistant", text: "", loading: true }]);
    try {
      const r = await recall(text);
      setMessages((m) => m.map((x) => x.id === aId ? { ...x, result: r, loading: false } : x));
    } catch (e) {
      setMessages((m) => m.map((x) => x.id === aId ? { ...x, error: String(e), loading: false } : x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageBody width="default">
        <PageHeader
          eyebrow="Research chat"
          title="Ask memory anything."
          meta="Traverses the knowledge graph, ranks evidence by relevance, and synthesizes a cited answer."
        />

        <Card className="overflow-hidden">
          <div
            ref={scrollRef}
            className="overflow-y-auto p-6 space-y-5"
            style={{ height: "calc(100vh - 320px)", minHeight: 400 }}
          >
            {messages.length === 0 && (
              <EmptyState
                icon={<MessageSquare size={20} strokeWidth={1.5} />}
                title="Start a research conversation."
                description="Try: “What concepts connect the documents I’ve uploaded?” or “Summarize recent findings on agent architectures.”"
                action={
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "What concepts connect the documents?",
                      "How have AI agents evolved?",
                      "Summarize recent papers.",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="text-[12px] px-3 py-1.5 rounded-[3px] transition-colors"
                        style={{
                          background: "var(--color-surface-2)",
                          color: "var(--color-ink-muted)",
                          border: "1px solid var(--color-rule-soft)",
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                }
              />
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
          <div
            className="border-t p-4 flex items-end gap-3"
            style={{ borderColor: "var(--color-rule-soft)" }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              placeholder="Ask a research question…"
              rows={2}
              className="flex-1 resize-none text-[13.5px] px-3 py-2.5 rounded-[3px]"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-rule)",
              }}
            />
            <Button
              variant="accent"
              size="lg"
              onClick={ask}
              disabled={busy || !input.trim()}
              leftIcon={<Send size={14} />}
            >
              Ask
            </Button>
          </div>
        </Card>
      </PageBody>
    </AppShell>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] rounded-[6px] px-4 py-2.5 text-[13.5px] leading-[1.55]"
          style={{
            background: "var(--color-surface-2)",
            color: "var(--color-ink-strong)",
            border: "1px solid var(--color-rule)",
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }
  if (message.loading) {
    return (
      <div className="flex justify-start">
        <div
          className="rounded-[6px] px-4 py-2.5 text-[13.5px] italic flex items-center gap-2"
          style={{
            background: "var(--color-accent-soft)",
            color: "var(--color-ink-muted)",
            border: "1px solid var(--color-accent-line)",
          }}
        >
          <Sparkles size={12} style={{ color: "var(--color-accent)" }} />
          Recalling from memory
          <span className="animate-pulse-dot">…</span>
        </div>
      </div>
    );
  }
  if (message.error) {
    return (
      <div
        className="rounded-[6px] px-4 py-2.5 text-[13.5px]"
        style={{
          background: "var(--color-danger-soft)",
          color: "var(--color-danger)",
          border: "1px solid var(--color-danger)",
        }}
      >
        {message.error}
      </div>
    );
  }
  const r = message.result;
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-3">
        <div
          className="rounded-[6px] px-4 py-3 text-[13.5px] leading-[1.6]"
          style={{
            background: "var(--color-surface-2)",
            color: "var(--color-ink-strong)",
            border: "1px solid var(--color-rule-soft)",
          }}
        >
          {r?.answer || "I don’t have any memory relevant to that question yet."}
        </div>
        {r && r.evidence.length > 0 && (
          <div>
            <div className="eyebrow mb-2 px-1">Evidence</div>
            <ul className="space-y-2">
              {r.evidence.map((e, i) => (
                <li
                  key={i}
                  className="rounded-[5px] px-3 py-2 text-[12.5px] leading-[1.5]"
                  style={{
                    background: "var(--color-surface)",
                    color: "var(--color-ink-muted)",
                    border: "1px solid var(--color-rule-soft)",
                    borderLeft: "2px solid var(--color-accent)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] tracking-[0.04em]" style={{ color: "var(--color-ink-faint)" }}>
                      {e.source || "memory"} · score {e.score.toFixed(1)}
                    </span>
                  </div>
                  {e.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
