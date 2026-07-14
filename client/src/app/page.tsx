import Link from "next/link";
import { ArrowRight, Brain, Network, MessageSquare, Zap, GitBranch, Search, Database, HardDrive, Cpu, CloudCog } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-ink)" }}
    >
      {/* ── HEADER ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: "oklch(0.135 0.006 75 / 0.80)",
          borderColor: "var(--color-rule-soft)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 inline-flex items-center justify-center shrink-0"
              style={{
                background: "var(--color-accent-soft)",
                border: "1px solid var(--color-accent-line)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-accent)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="7" cy="7" r="1.2" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[14px] font-medium tracking-[-0.01em]" style={{ color: "var(--color-ink-strong)" }}>
              AEGIS
            </span>
            <span
              className="hidden sm:inline-flex text-[10px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-[3px]"
              style={{
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent-line)",
              }}
            >
              v3.0
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {["Features", "Infrastructure", "Chat"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[13px] transition-colors"
                style={{ color: "var(--color-ink-faint)" }}
              >
                {item}
              </a>
            ))}
          </nav>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 h-8 px-4 text-[12.5px] font-medium rounded-[4px] transition-colors"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-accent-ink)",
            }}
          >
            Open app
            <ArrowRight size={11} />
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className="relative pt-14 min-h-screen flex flex-col items-center justify-center overflow-hidden px-6"
        id="features"
      >
        {/* Multi-layer background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {/* Large emerald halo at top */}
          <div
            style={{
              position: "absolute",
              top: "-10%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "900px",
              height: "500px",
              background: "radial-gradient(ellipse at center, oklch(0.62 0.15 150 / 0.13) 0%, transparent 65%)",
              filter: "blur(1px)",
            }}
          />
          {/* AWS orange counterpoint bottom-right */}
          <div
            style={{
              position: "absolute",
              bottom: "5%",
              right: "-5%",
              width: "600px",
              height: "400px",
              background: "radial-gradient(ellipse at center, oklch(0.72 0.16 55 / 0.07) 0%, transparent 65%)",
            }}
          />
          {/* Blue hint bottom-left */}
          <div
            style={{
              position: "absolute",
              bottom: "10%",
              left: "-5%",
              width: "400px",
              height: "300px",
              background: "radial-gradient(ellipse at center, oklch(0.62 0.13 240 / 0.05) 0%, transparent 65%)",
            }}
          />
          {/* Horizontal rule grid lines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "linear-gradient(oklch(0.30 0.005 75 / 0.15) 1px, transparent 1px)",
              backgroundSize: "100% 80px",
            }}
          />
        </div>

        <div className="relative max-w-4xl text-center z-10">
          {/* Announcement pill */}
          <div
            className="animate-fade-up stagger-1 inline-flex items-center gap-2.5 mb-10 px-4 py-2 rounded-full border"
            style={{
              background: "oklch(0.165 0.006 75 / 0.80)",
              borderColor: "var(--color-rule)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse-dot"
              style={{ background: "#FF9900" }}
            />
            <span className="text-[11.5px] tracking-[0.12em] uppercase font-medium" style={{ color: "var(--color-ink-muted)" }}>
              Context Memory AI · Built on AWS
            </span>
            <span className="text-[11.5px]" style={{ color: "var(--color-ink-ghost)" }}>→</span>
          </div>

          {/* Hero headline */}
          <h1
            className="font-display leading-[1.02] tracking-[-0.025em] animate-fade-up stagger-2"
            style={{
              fontSize: "clamp(3.2rem, 6vw + 1rem, 6.5rem)",
              color: "var(--color-ink-strong)",
            }}
          >
            <em className="display-italic" style={{ fontWeight: 300, color: "var(--color-accent)" }}>
              Ingest anything.
            </em>
            <br />
            Remember forever.
          </h1>

          {/* Descriptor */}
          <p
            className="mt-7 text-[17px] leading-[1.65] max-w-2xl mx-auto animate-fade-up stagger-3"
            style={{ color: "var(--color-ink-muted)" }}
          >
            AEGIS is context memory AI built on{" "}
            <span style={{ color: "#FF9900", fontWeight: 500 }}>AWS</span>.
            It turns documents, repos, URLs, and notes into a living knowledge graph stored in{" "}
            <span style={{ color: "var(--color-ink-strong)", fontWeight: 500 }}>DynamoDB</span> and{" "}
            <span style={{ color: "var(--color-ink-strong)", fontWeight: 500 }}>S3</span> — persistent, serverless, zero-cost infrastructure.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-up stagger-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 h-12 px-7 text-[14px] font-medium rounded-[5px] transition-all"
              style={{
                background: "var(--color-accent)",
                color: "var(--color-accent-ink)",
                boxShadow: "0 0 0 1px oklch(0.62 0.15 150 / 0.5), 0 8px 24px oklch(0.62 0.15 150 / 0.20)",
              }}
            >
              Enter the workspace
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 h-12 px-6 text-[14px] rounded-[5px] border transition-colors"
              style={{
                borderColor: "var(--color-rule)",
                color: "var(--color-ink-muted)",
                background: "oklch(0.165 0.006 75 / 0.60)",
                backdropFilter: "blur(8px)",
              }}
            >
              Try memory chat
            </Link>
          </div>

          {/* AWS stack badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 animate-fade-up stagger-5">
            {[
              { name: "Amazon S3", color: "#3F8624" },
              { name: "DynamoDB", color: "#6B48FF" },
              { name: "Bedrock", color: "#FF9900" },
              { name: "FastAPI", color: "var(--color-accent)" },
            ].map(({ name, color }) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[11.5px] tracking-[0.06em] font-medium border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-rule-soft)",
                  color: "var(--color-ink-faint)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: color }}
                />
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-fade-up stagger-5 flex flex-col items-center gap-2"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          <div
            className="w-px h-10 animate-pulse-dot"
            style={{ background: "linear-gradient(to bottom, transparent, var(--color-rule-strong))" }}
          />
        </div>
      </section>

      {/* ── GRAPH PREVIEW STRIP ── */}
      <section
        className="border-t border-b py-5 overflow-hidden"
        style={{ borderColor: "var(--color-rule-soft)", background: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-8 px-8 opacity-60">
          {[
            "Knowledge Graphs", "Amazon DynamoDB", "S3 Archival", "Memory Lifecycle",
            "Concept Merging", "PDF Ingestion", "GitHub Indexing", "YouTube Transcripts",
            "Bedrock LLM", "Evidence Chains",
          ].map((item) => (
            <span
              key={item}
              className="shrink-0 text-[11.5px] tracking-[0.08em] uppercase whitespace-nowrap"
              style={{ color: "var(--color-ink-faint)" }}
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="py-24 px-6" id="graph">
        <div className="max-w-5xl mx-auto">
          {/* Section eyebrow */}
          <div className="text-center mb-14">
            <div className="eyebrow mb-3">The memory lifecycle</div>
            <h2
              className="font-display tracking-[-0.02em] leading-[1.05]"
              style={{
                fontSize: "clamp(2rem, 3vw + 0.5rem, 3.2rem)",
                color: "var(--color-ink-strong)",
              }}
            >
              Four verbs. One graph.
            </h2>
          </div>

          {/* 2×2 feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<Brain size={20} strokeWidth={1.4} />}
              number="01"
              title="Remember"
              body="Feed AEGIS any artifact — PDF, URL, GitHub repo, YouTube video, raw notes. Concepts and relationships are extracted and written to DynamoDB as a persistent knowledge graph."
              accent="var(--color-accent)"
            />
            <FeatureCard
              icon={<Search size={20} strokeWidth={1.4} />}
              number="02"
              title="Recall"
              body="Ask anything in natural language. AEGIS traverses the graph in DynamoDB and retrieves source content from S3, synthesizing a cited answer — not keyword matching."
              accent="var(--color-info)"
            />
            <FeatureCard
              icon={<GitBranch size={20} strokeWidth={1.4} />}
              number="03"
              title="Improve"
              body="As you add more, AEGIS detects duplicate concepts, merges them in DynamoDB, and strengthens relationships. The graph gets sharper over time, not noisy."
              accent="var(--color-amber)"
            />
            <FeatureCard
              icon={<Zap size={20} strokeWidth={1.4} />}
              number="04"
              title="Forget"
              body="Obsolete content? Controlled deletion removes a dataset from DynamoDB and S3, pruning its influence from the graph while preserving shared concepts."
              accent="var(--color-danger)"
            />
          </div>
        </div>
      </section>

      {/* ── AWS INFRASTRUCTURE SECTION ── */}
      <section
        className="py-20 px-6 border-t"
        id="infrastructure"
        style={{ borderColor: "var(--color-rule-soft)", background: "var(--color-surface)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="eyebrow mb-3">Infrastructure</div>
            <h2
              className="font-display tracking-[-0.02em] leading-[1.05]"
              style={{
                fontSize: "clamp(2rem, 3vw + 0.5rem, 3.2rem)",
                color: "var(--color-ink-strong)",
              }}
            >
              Zero-cost AWS stack.
            </h2>
            <p className="mt-5 text-[15px] leading-[1.65] max-w-xl mx-auto" style={{ color: "var(--color-ink-muted)" }}>
              No servers to provision. No clusters to manage. No idle costs.
              AEGIS runs entirely on AWS Free Tier serverless services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfraCard
              icon={<HardDrive size={22} strokeWidth={1.3} />}
              service="Amazon S3"
              color="#3F8624"
              tier="5 GB free · 12 months"
              desc="Every ingested artifact is archived as raw text. Full content is fetched at recall time for accurate, citation-backed answers."
            />
            <InfraCard
              icon={<Database size={22} strokeWidth={1.3} />}
              service="Amazon DynamoDB"
              color="#6B48FF"
              tier="25 GB free · always"
              desc="The knowledge graph lives here — nodes, edges, and dataset metadata stored in three PAY_PER_REQUEST tables with zero provisioning."
            />
            <InfraCard
              icon={<Cpu size={22} strokeWidth={1.3} />}
              service="Amazon Bedrock"
              color="#FF9900"
              tier="Optional · pay-per-token"
              desc="Add a model ID to upgrade from keyword recall to Claude-powered answer synthesis. Leave blank to run entirely free."
            />
          </div>

          {/* Cost callout */}
          <div
            className="mt-8 rounded-xl px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border"
            style={{
              background: "color-mix(in oklch, #FF9900 6%, var(--color-bg))",
              borderColor: "color-mix(in oklch, #FF9900 20%, transparent)",
            }}
          >
            <div className="flex items-center gap-3">
              <CloudCog size={20} style={{ color: "#FF9900", flexShrink: 0 }} />
              <div>
                <div className="text-[13.5px] font-medium" style={{ color: "var(--color-ink-strong)" }}>
                  Total monthly cost for typical usage
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--color-ink-muted)" }}>
                  DynamoDB (always free) + S3 (free tier) + no Bedrock = <strong>$0</strong>
                </div>
              </div>
            </div>
            <span
              className="shrink-0 text-[12px] font-mono font-semibold px-4 py-2 rounded-[6px]"
              style={{
                background: "color-mix(in oklch, #FF9900 15%, transparent)",
                color: "#FF9900",
                border: "1px solid color-mix(in oklch, #FF9900 30%, transparent)",
              }}
            >
              $0 / month
            </span>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section
        className="border-t border-b py-10 px-6"
        style={{ borderColor: "var(--color-rule-soft)" }}
        id="chat"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "∞", label: "Memory capacity", sub: "DynamoDB scales automatically" },
            { value: "<1s", label: "Recall latency", sub: "Graph + S3 content fetch" },
            { value: "5+", label: "Source types", sub: "PDF, URL, GitHub, YT, Text" },
            { value: "$0", label: "Infrastructure cost", sub: "AWS Free Tier stack" },
          ].map(({ value, label, sub }) => (
            <div key={label} className="text-center">
              <div
                className="font-display text-[3rem] tracking-[-0.03em] leading-none nums mb-1"
                style={{ color: "var(--color-accent)" }}
              >
                {value}
              </div>
              <div className="text-[13px] font-medium mb-0.5" style={{ color: "var(--color-ink-strong)" }}>
                {label}
              </div>
              <div className="text-[11px] tracking-[0.04em] uppercase" style={{ color: "var(--color-ink-ghost)" }}>
                {sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUICK LINKS ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="eyebrow mb-8 text-center">Start here</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickLink
              href="/memory"
              icon={<Brain size={18} strokeWidth={1.4} />}
              title="Memory Manager"
              body="Ingest and manage all your sources. Everything persists to AWS automatically."
            />
            <QuickLink
              href="/chat"
              icon={<MessageSquare size={18} strokeWidth={1.4} />}
              title="Memory Chat"
              body="Ask questions across all ingested knowledge. Answers cite sources from S3."
            />
            <QuickLink
              href="/graph"
              icon={<Network size={18} strokeWidth={1.4} />}
              title="Knowledge Graph"
              body="Visualize the DynamoDB-backed concept graph — nodes, edges, relationships."
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="border-t mt-auto"
        style={{ borderColor: "var(--color-rule-soft)" }}
      >
        <div
          className="max-w-6xl mx-auto px-6 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-5 w-5 inline-flex items-center justify-center shrink-0"
              style={{
                background: "var(--color-accent-soft)",
                border: "1px solid var(--color-accent-line)",
                borderRadius: "var(--radius-xs)",
                color: "var(--color-accent)",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="7" cy="7" r="1.4" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[12px] tracking-[0.04em]" style={{ color: "var(--color-ink-ghost)" }}>
              AEGIS · Context Memory AI · v3.0
            </span>
          </div>
          <div className="flex items-center gap-5">
            {[
              { name: "Amazon S3", color: "#3F8624" },
              { name: "DynamoDB", color: "#6B48FF" },
              { name: "Bedrock", color: "#FF9900" },
            ].map(({ name, color }) => (
              <span key={name} className="flex items-center gap-1.5 text-[11px] tracking-[0.06em] uppercase" style={{ color: "var(--color-ink-ghost)" }}>
                <span className="h-1 w-1 rounded-full" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  number,
  title,
  body,
  accent,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div
      className="case-card p-7 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div
          className="h-10 w-10 inline-flex items-center justify-center rounded-[6px]"
          style={{
            background: `color-mix(in oklch, ${accent} 12%, transparent)`,
            border: `1px solid color-mix(in oklch, ${accent} 30%, transparent)`,
            color: accent,
          }}
        >
          {icon}
        </div>
        <span
          className="font-mono text-[12px] tracking-[0.06em]"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          {number}
        </span>
      </div>
      <div>
        <h3
          className="font-display text-[19px] tracking-[-0.01em] mb-2"
          style={{ color: "var(--color-ink-strong)" }}
        >
          {title}
        </h3>
        <p
          className="text-[13px] leading-[1.65]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

function InfraCard({
  icon,
  service,
  color,
  tier,
  desc,
}: {
  icon: React.ReactNode;
  service: string;
  color: string;
  tier: string;
  desc: string;
}) {
  return (
    <div
      className="case-card p-6 flex flex-col gap-4"
      style={{
        borderTop: `2px solid ${color}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="h-10 w-10 inline-flex items-center justify-center rounded-[6px]"
          style={{
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            color: color,
          }}
        >
          {icon}
        </div>
        <span
          className="text-[10.5px] font-mono tracking-[0.06em] px-2 py-0.5 rounded"
          style={{
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            color: color,
            border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
          }}
        >
          {tier}
        </span>
      </div>
      <div>
        <h3
          className="text-[15px] font-semibold tracking-[-0.005em] mb-2"
          style={{ color: "var(--color-ink-strong)" }}
        >
          {service}
        </h3>
        <p className="text-[13px] leading-[1.65]" style={{ color: "var(--color-ink-muted)" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="case-card p-6 block group">
      <div className="flex items-center justify-between mb-3">
        <div
          className="h-9 w-9 inline-flex items-center justify-center rounded-[6px]"
          style={{
            background: "var(--color-accent-soft)",
            border: "1px solid var(--color-accent-line)",
            color: "var(--color-accent)",
          }}
        >
          {icon}
        </div>
        <ArrowRight
          size={14}
          style={{ color: "var(--color-ink-ghost)", transition: "transform 160ms" }}
          className="group-hover:translate-x-0.5 transition-transform"
        />
      </div>
      <div
        className="text-[14.5px] font-medium tracking-[-0.005em] mb-1.5"
        style={{ color: "var(--color-ink-strong)" }}
      >
        {title}
      </div>
      <p className="text-[12.5px] leading-[1.55]" style={{ color: "var(--color-ink-muted)" }}>
        {body}
      </p>
    </Link>
  );
}
