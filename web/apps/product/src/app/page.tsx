"use client";

import { useEffect, useRef, useState } from "react";
import {
  FlaskConical,
  Search,
  Atom,
  FileText,
  Bot,
  File,
  Upload,
  LayoutGrid,
  List,
  Tag,
  Settings,
  ChevronRight,
} from "lucide-react";
import { ShapeGrid } from "@/components/backgrounds/ShapeGrid";

const tabs = [
  {
    id: "search",
    label: "Search",
    description:
      "Semantic search across documents, summaries, and compounds — with Exact Match, Overview, and Deep Search modes.",
  },
  {
    id: "chat",
    label: "Chat",
    description:
      "Ask AI any question about your documents and get fully cited, traceable answers grounded in your actual data.",
  },
  {
    id: "compounds",
    label: "Compounds",
    description:
      "Search for structurally similar compounds by SMILES string or draw a structure directly in the editor.",
  },
  {
    id: "documents",
    label: "Documents",
    description:
      "Upload, organize, and access every protocol, report, and filing from a single structured workspace.",
  },
];

export default function ProductPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCardVisible(true); },
      { threshold: 0.08 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  function switchTab(i: number) {
    if (i === activeTab) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveTab(i);
      setTransitioning(false);
    }, 180);
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: "#0d1117", color: "#e6edf3" }}
    >
      <ShapeGrid color={[88, 166, 255]} glowRadius={260} cellSize={52} />

      {/* Hero top glow */}
      <div
        className="pointer-events-none fixed left-1/2 -translate-x-1/2"
        style={{
          top: "-180px",
          width: "960px",
          height: "720px",
          background:
            "radial-gradient(ellipse at 50% 28%, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.08) 45%, transparent 70%)",
        }}
      />

      {/* Sticky Nav */}
      <nav
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 md:px-10"
        style={{
          background: "rgba(13,17,23,0.85)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(48,54,61,0.5)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: "rgba(88,166,255,0.12)",
              boxShadow: "0 0 14px rgba(88,166,255,0.18)",
            }}
          >
            <FlaskConical className="h-4 w-4" style={{ color: "#58a6ff" }} />
          </div>
          <span className="text-sm font-semibold tracking-wide" style={{ color: "#e6edf3" }}>
            DocuStore
          </span>
        </div>
        <a
          href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:15000"}
          className="rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200 hover:opacity-80"
          style={{
            background: "rgba(33,38,45,0.8)",
            color: "#e6edf3",
            border: "1px solid rgba(240,246,252,0.1)",
          }}
        >
          Sign in →
        </a>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 pb-52 pt-20 text-center md:pt-28">
          {/* Pill badge */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-medium"
            style={{
              background: "rgba(88,166,255,0.08)",
              border: "1px solid rgba(88,166,255,0.22)",
              color: "#58a6ff",
              animation: "auth-enter 0.6s ease-out 0.05s both",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#58a6ff", boxShadow: "0 0 6px #58a6ff" }}
            />
            Drug Discovery · Document Intelligence
          </div>

          <h1
            className="text-4xl font-extrabold leading-tight tracking-tight md:text-[3.75rem]"
            style={{
              color: "#e6edf3",
              animation: "auth-enter 0.7s ease-out 0.15s both",
            }}
          >
            Let the{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #58a6ff 0%, #bc8cff 55%, #79c0ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              science
            </span>{" "}
            speak.
          </h1>

          <p
            className="mx-auto mt-5 max-w-lg text-base leading-relaxed md:text-lg"
            style={{
              color: "#8b949e",
              animation: "auth-enter 0.7s ease-out 0.25s both",
            }}
          >
            DocuStore keeps your drug discovery knowledge navigable: semantic
            search, chemistry-aware queries, and AI-powered Q&amp;A, all
            grounded in your actual documents.
          </p>

          {/* CTA */}
          <div
            className="mt-10"
            style={{ animation: "auth-enter 0.7s ease-out 0.35s both" }}
          >
            <a
              href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:15000"}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-lg active:translate-y-0"
              style={{ background: "#58a6ff", color: "#0d1117" }}
            >
              Get started →
            </a>
          </div>
        </div>

        {/* Bottom gradient */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: "320px",
            background: "linear-gradient(to bottom, transparent 0%, rgba(22,27,34,0.6) 50%, #161b22 100%)",
            zIndex: 2,
          }}
        />
      </section>

      {/* ── Section 2: Tab showcase ── */}
      <section
        style={{
          background: "linear-gradient(180deg, #0d1117 0%, #161b22 12%, #161b22 100%)",
          borderRadius: "24px 24px 0 0",
          marginTop: "-72px",
          position: "relative",
          zIndex: 20,
          overflow: "hidden",
        }}
      >
        {/* Atmospheric halo */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: "700px",
            background:
              "radial-gradient(ellipse 100% 55% at 50% 0%, rgba(139,92,246,0.18) 0%, rgba(88,166,255,0.1) 35%, transparent 70%)",
          }}
        />

        {/* Mockup card — zoom-in on scroll */}
        <div className="relative mx-auto max-w-6xl px-6 pb-0 pt-16">
          <div
            className="pointer-events-none absolute inset-x-0 top-8"
            style={{
              height: "120%",
              background:
                "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(139,92,246,0.2) 0%, rgba(88,166,255,0.12) 40%, transparent 70%)",
              zIndex: 0,
            }}
          />
          <div
            ref={cardRef}
            className="relative rounded-2xl p-px"
            style={{
              background:
                "linear-gradient(160deg, rgba(139,92,246,0.6) 0%, rgba(88,166,255,0.4) 25%, rgba(48,54,61,0.35) 55%, rgba(48,54,61,0.15) 100%)",
              boxShadow:
                "0 0 0 1px rgba(139,92,246,0.08), 0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(139,92,246,0.12)",
              zIndex: 1,
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? "scale(1) translateY(0)" : "scale(0.94) translateY(24px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{ background: "#0d1117", minHeight: "480px" }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center gap-2 border-b px-5 py-3"
                style={{ background: "#161b22", borderColor: "rgba(48,54,61,0.8)" }}
              >
                <div className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "#ffc72c" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "#28ca41" }} />
                <div
                  className="mx-3 flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-xs"
                  style={{ background: "#0d1117", color: "#8b949e" }}
                >
                  <FlaskConical className="h-3 w-3" style={{ color: "#484f58" }} />
                  DocuStore ·{" "}
                  <span style={{ opacity: transitioning ? 0 : 1, transition: "opacity 0.18s ease" }}>
                    {tabs[activeTab].label}
                  </span>
                </div>
              </div>

              {/* Panel content */}
              <div
                style={{
                  opacity: transitioning ? 0 : 1,
                  transform: transitioning ? "translateY(8px)" : "translateY(0)",
                  transition: "opacity 0.22s ease, transform 0.22s ease",
                }}
              >
                {activeTab === 0 && <SearchPanel />}
                {activeTab === 1 && <ChatPanel />}
                {activeTab === 2 && <CompoundsPanel />}
                {activeTab === 3 && <DocumentsPanel />}
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar + description */}
        <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-8 text-center">
          <div
            className="inline-flex items-center rounded-full p-1"
            style={{
              background: "rgba(13,17,23,0.6)",
              border: "1px solid rgba(240,246,252,0.08)",
            }}
          >
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => switchTab(i)}
                className="rounded-full px-5 py-2 text-sm font-medium transition-all duration-200"
                style={
                  activeTab === i
                    ? { background: "rgba(22,27,34,0.9)", color: "#e6edf3", border: "1px solid rgba(240,246,252,0.15)" }
                    : { background: "transparent", color: "#8b949e", border: "1px solid transparent" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p
            className="mx-auto mt-4 max-w-xl text-sm leading-relaxed"
            style={{
              color: "#8b949e",
              opacity: transitioning ? 0 : 1,
              transform: transitioning ? "translateY(4px)" : "translateY(0)",
              transition: "opacity 0.18s ease, transform 0.18s ease",
            }}
          >
            {tabs[activeTab].description}
          </p>
        </div>

        {/* Footer */}
        <footer
          className="flex flex-col items-center gap-1.5 py-8 text-center"
          style={{ borderTop: "1px solid rgba(48,54,61,0.4)" }}
        >
          <div className="flex items-center gap-1.5">
            <FlaskConical className="h-3 w-3" style={{ color: "#484f58" }} />
            <span className="text-xs" style={{ color: "#484f58" }}>DocuStore</span>
          </div>
          <p className="text-[11px]" style={{ color: "#30363d" }}>
            &copy; 2026 DocuStore. All rights reserved.
          </p>
        </footer>
      </section>
    </div>
  );
}

/* ── Shared helpers ── */
function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/* ══════════════════════════════════════════
   SEARCH PANEL
   ══════════════════════════════════════════ */
function SearchPanel() {
  const QUERY = "immunotherapy dose escalation protocol";
  const MODES = ["Exact Match", "Overview Search", "Deep Search"] as const;
  const results = [
    { type: "Protocol",      typeColor: "#a78bfa", title: "Phase II Immunotherapy Protocol v3.2",   snippet: "CD8+ T-cell activation observed at 48h post-treatment. Dose escalation to 10 mg/kg recommended based on preliminary data.", score: 94 },
    { type: "Assay Report",  typeColor: "#34d399", title: "Q3 Assay Summary — Compound 47B",         snippet: "IC50 measurements confirm 12 nM inhibition. Structural analogs show reduced off-target binding at the ATP-binding site.", score: 87 },
    { type: "Regulatory",    typeColor: "#fbbf24", title: "IND Application Draft — Safety Package",  snippet: "28-day toxicity study supports the proposed starting dose. No adverse findings at therapeutic exposure levels.", score: 81 },
    { type: "Study Summary", typeColor: "#58a6ff", title: "Biomarker Analysis Report — Q4",           snippet: "PD-L1 expression correlates with response rate at 0.78 Pearson coefficient. Subset analysis shows 62% ORR.", score: 76 },
  ];

  const [typed,      setTyped]      = useState(0);
  const [activeMode, setActiveMode] = useState(0);
  const [visible,    setVisible]    = useState(0);
  const [blink,      setBlink]      = useState(true);
  const [cycle,      setCycle]      = useState(0);

  useEffect(() => {
    const id = setInterval(() => setBlink((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    setTyped(0); setVisible(0); setActiveMode(0);
    (async () => {
      await wait(400);
      // type query
      for (let i = 1; i <= QUERY.length; i++) {
        if (!alive) return;
        setTyped(i);
        await wait(34);
      }
      await wait(400);
      // cycle through modes
      setActiveMode(1); await wait(350);
      setActiveMode(2); await wait(350);
      // show results
      for (let i = 1; i <= results.length; i++) {
        if (!alive) return;
        await wait(260);
        setVisible(i);
      }
      await wait(2800);
      if (alive) setCycle((c) => c + 1);
    })();
    return () => { alive = false; };
  }, [cycle]);

  return (
    <div className="p-5">
      {/* Search bar */}
      <div
        className="mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2.5"
        style={{ background: "#161b22", border: "1px solid rgba(88,166,255,0.35)", boxShadow: "0 0 12px rgba(88,166,255,0.06)" }}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#58a6ff" }} />
        <span className="flex-1 text-sm" style={{ color: "#e6edf3" }}>
          {QUERY.slice(0, typed)}
          <span style={{ display: "inline-block", width: "1px", height: "0.85em", background: "#58a6ff", verticalAlign: "text-bottom", marginLeft: "1px", opacity: blink ? 1 : 0, transition: "opacity 0.1s" }} />
        </span>
        <div className="rounded px-2.5 py-1 text-[11px] font-medium" style={{ background: "rgba(88,166,255,0.15)", color: "#58a6ff" }}>Search</div>
      </div>

      {/* Mode tabs */}
      <div className="mb-4 flex items-center gap-2">
        {MODES.map((m, i) => (
          <button
            key={m}
            className="rounded-md px-3 py-1 text-[11px] font-medium transition-all duration-200"
            style={
              activeMode === i
                ? { background: "#58a6ff", color: "#0d1117" }
                : { background: "rgba(22,27,34,0.6)", color: "#8b949e", border: "1px solid rgba(48,54,61,0.5)" }
            }
          >
            {m}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: "#484f58" }}>
          <Tag className="h-3 w-3" />
          Tag Filters
        </div>
      </div>

      {/* Results */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {results.map((r, i) => (
          <div
            key={i}
            className="rounded-lg p-3.5"
            style={{
              background: "rgba(22,27,34,0.6)", border: "1px solid rgba(48,54,61,0.5)",
              opacity: i < visible ? 1 : 0,
              transform: i < visible ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
            }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${r.typeColor}15`, color: r.typeColor, border: `1px solid ${r.typeColor}25` }}>{r.type}</span>
                <span className="truncate text-xs font-medium" style={{ color: "#e6edf3" }}>{r.title}</span>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold tabular-nums" style={{ color: r.score > 90 ? "#34d399" : r.score > 85 ? "#58a6ff" : "#a78bfa" }}>{r.score}%</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "#8b949e" }}>{r.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   CHAT PANEL
   ══════════════════════════════════════════ */
function ChatPanel() {
  const USER_MSG = "What were the key efficacy findings from the Phase II immunotherapy trial?";
  const AI_INTRO = "Based on the Phase II Immunotherapy Protocol v3.2 [1], the key efficacy findings were:";
  const bullets = [
    "CD8+ T-cell activation confirmed at 48h post-treatment across all dose cohorts",
    "Overall response rate of 54% at the 10 mg/kg dose level [1]",
    "Median progression-free survival of 8.3 months, exceeding the 6-month benchmark [2]",
    "PD-L1 high expressors showed 62% ORR vs 31% in the PD-L1 low group [3]",
  ];
  const sources = [
    { label: "Phase II Protocol v3.2", color: "#a78bfa" },
    { label: "Q3 Clinical Summary",    color: "#58a6ff" },
    { label: "Biomarker Analysis Q4",  color: "#34d399" },
  ];

  const [showUser,       setShowUser]       = useState(false);
  const [showThinking,   setShowThinking]   = useState(false);
  const [showAi,         setShowAi]         = useState(false);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [visibleSources, setVisibleSources] = useState(0);
  const [thinkingActive, setThinkingActive] = useState(false);
  const [cycle,          setCycle]          = useState(0);

  useEffect(() => {
    let alive = true;
    setShowUser(false); setShowThinking(false); setShowAi(false);
    setVisibleBullets(0); setVisibleSources(0); setThinkingActive(false);
    (async () => {
      await wait(350);
      if (!alive) return; setShowUser(true);
      await wait(900);
      if (!alive) return; setThinkingActive(true); setShowThinking(true);
      await wait(1400);
      if (!alive) return; setShowThinking(false); setShowAi(true);
      await wait(400);
      for (let i = 1; i <= bullets.length; i++) {
        if (!alive) return; setVisibleBullets(i); await wait(360);
      }
      for (let i = 1; i <= sources.length; i++) {
        if (!alive) return; setVisibleSources(i); await wait(220);
      }
      await wait(2500);
      if (alive) setCycle((c) => c + 1);
    })();
    return () => { alive = false; };
  }, [cycle]);

  return (
    <div className="flex flex-col" style={{ minHeight: "420px" }}>
      {/* Messages area */}
      <div className="flex-1 space-y-4 p-5">
        {/* User message */}
        <div
          className="flex justify-end"
          style={{ opacity: showUser ? 1 : 0, transform: showUser ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.4s ease, transform 0.4s ease" }}
        >
          <div
            className="max-w-sm rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
            style={{ background: "rgba(88,166,255,0.15)", color: "#e6edf3", border: "1px solid rgba(88,166,255,0.2)" }}
          >
            {USER_MSG}
          </div>
        </div>

        {/* Thinking dots */}
        {showThinking && (
          <div className="flex gap-3" style={{ animation: "auth-enter 0.3s ease both" }}>
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(88,166,255,0.12)", border: "1px solid rgba(88,166,255,0.2)" }}>
              <Bot className="h-3.5 w-3.5" style={{ color: "#58a6ff" }} />
            </div>
            <div className="flex items-center gap-1 rounded-2xl px-3 py-2.5" style={{ background: "rgba(22,27,34,0.6)", border: "1px solid rgba(48,54,61,0.5)" }}>
              {[0, 1, 2].map((d) => (
                <span key={d} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#58a6ff", animation: `blink 1.1s ease-in-out ${d * 0.18}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* AI response */}
        {showAi && (
          <div className="flex gap-3" style={{ animation: "auth-enter 0.35s ease both" }}>
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(88,166,255,0.12)", border: "1px solid rgba(88,166,255,0.2)" }}>
              <Bot className="h-3.5 w-3.5" style={{ color: "#58a6ff" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed" style={{ color: "#e6edf3" }}>{AI_INTRO}</p>
              <ul className="mt-2 space-y-1.5">
                {bullets.map((b, j) => (
                  <li key={j} className="flex gap-2 text-sm" style={{ color: "#c9d1d9", opacity: j < visibleBullets ? 1 : 0, transform: j < visibleBullets ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.3s ease, transform 0.3s ease" }}>
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "#58a6ff" }} />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sources.map((s, j) => (
                  <span key={j} className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: `${s.color}12`, color: s.color, border: `1px solid ${s.color}25`, opacity: j < visibleSources ? 1 : 0, transform: j < visibleSources ? "translateY(0)" : "translateY(4px)", transition: "opacity 0.25s ease, transform 0.25s ease" }}>
                    [{j + 1}] {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t px-5 pb-4 pt-3" style={{ borderColor: "rgba(48,54,61,0.5)" }}>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-300"
            style={
              thinkingActive
                ? { background: "rgba(88,166,255,0.15)", color: "#58a6ff", border: "1px solid rgba(88,166,255,0.3)" }
                : { background: "rgba(22,27,34,0.6)", color: "#8b949e", border: "1px solid rgba(48,54,61,0.5)" }
            }
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: thinkingActive ? "#58a6ff" : "#484f58", boxShadow: thinkingActive ? "0 0 6px #58a6ff" : "none", transition: "all 0.3s" }} />
            Thinking
          </button>
          <div className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: "#161b22", border: "1px solid rgba(88,166,255,0.2)", color: "#484f58" }}>
            Ask a question about your documents…
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(88,166,255,0.15)", color: "#58a6ff" }}>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-center text-[10px]" style={{ color: "#30363d" }}>
          Docu Store AI can make mistakes. Always verify with the original documents.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPOUNDS PANEL
   ══════════════════════════════════════════ */
function CompoundsPanel() {
  const SMILES = "CC(C)(C)c1cc(NC(=O)c2ccc(F)cc2)ccc1";
  const compounds = [
    { id: "CPD-047B", name: "Compound 47B",    similarity: 1.00, mw: "327.4", activity: "12 nM",  color: "#34d399" },
    { id: "CPD-023A", name: "Compound 23A",    similarity: 0.91, mw: "343.8", activity: "34 nM",  color: "#58a6ff" },
    { id: "CPD-088C", name: "Lead Candidate",  similarity: 0.86, mw: "327.4", activity: "28 nM",  color: "#a78bfa" },
    { id: "CPD-012D", name: "Analog Series D", similarity: 0.79, mw: "313.4", activity: "89 nM",  color: "#fbbf24" },
  ];

  const [typed,      setTyped]      = useState(0);
  const [visible,    setVisible]    = useState(0);
  const [showStruct, setShowStruct] = useState(false);
  const [blink,      setBlink]      = useState(true);
  const [cycle,      setCycle]      = useState(0);

  useEffect(() => {
    const id = setInterval(() => setBlink((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    setTyped(0); setVisible(0); setShowStruct(false);
    (async () => {
      await wait(300);
      for (let i = 1; i <= SMILES.length; i++) {
        if (!alive) return; setTyped(i); await wait(26);
      }
      await wait(300);
      if (!alive) return; setShowStruct(true);
      await wait(400);
      for (let i = 1; i <= compounds.length; i++) {
        if (!alive) return; await wait(260); setVisible(i);
      }
      await wait(2800);
      if (alive) setCycle((c) => c + 1);
    })();
    return () => { alive = false; };
  }, [cycle]);

  return (
    <div className="p-5">
      {/* SMILES input */}
      <div
        className="mb-4 flex items-center gap-2.5 rounded-lg px-3 py-2.5"
        style={{ background: "#161b22", border: "1px solid rgba(52,211,153,0.35)", boxShadow: "0 0 12px rgba(52,211,153,0.05)" }}
      >
        <Atom className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#34d399" }} />
        <span className="flex-1 font-mono text-xs" style={{ color: "#e6edf3" }}>
          {SMILES.slice(0, typed)}
          <span style={{ display: "inline-block", width: "1px", height: "0.85em", background: "#34d399", verticalAlign: "text-bottom", marginLeft: "1px", opacity: blink ? 1 : 0, transition: "opacity 0.1s" }} />
        </span>
        {typed >= SMILES.length && (
          <span className="flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)", animation: "auth-enter 0.3s ease both" }}>SMILES</span>
        )}
      </div>

      <div className="flex gap-4">
        {/* Structure preview */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-lg"
          style={{
            width: "120px", height: "100px",
            background: "#161b22", border: "1px solid rgba(48,54,61,0.5)",
            opacity: showStruct ? 1 : 0,
            transform: showStruct ? "scale(1)" : "scale(0.85)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <BenzeneRingSVG />
        </div>

        {/* Compound results */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {compounds.map((c, i) => (
            <div
              key={c.id}
              className="rounded-lg p-2.5"
              style={{
                background: "rgba(22,27,34,0.6)", border: "1px solid rgba(48,54,61,0.5)",
                opacity: i < visible ? 1 : 0,
                transform: i < visible ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-[11px] font-semibold" style={{ color: "#e6edf3" }}>{c.name}</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: c.color }}>{Math.round(c.similarity * 100)}%</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px]" style={{ color: "#8b949e" }}>MW <span style={{ color: "#c9d1d9" }}>{c.mw}</span></span>
                <span className="text-[10px]" style={{ color: "#8b949e" }}>IC50 <span style={{ color: c.color }}>{c.activity}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search button */}
      <div className="mt-4">
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium"
          style={{ background: "#58a6ff", color: "#0d1117" }}
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
      </div>
    </div>
  );
}

function BenzeneRingSVG() {
  // Regular hexagon centered at 50,50 r=28, with inner circle (aromatic)
  const cx = 50, cy = 50, r = 28, ri = 17;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * (Math.PI / 180);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" width="72" height="72">
      <polygon points={pts} fill="none" stroke="#34d399" strokeWidth="1.8" />
      <circle cx={cx} cy={cy} r={ri} fill="none" stroke="#34d399" strokeWidth="1.2" strokeDasharray="5 3" />
    </svg>
  );
}

/* ══════════════════════════════════════════
   DOCUMENTS PANEL
   ══════════════════════════════════════════ */
function DocumentsPanel() {
  const docs = [
    { icon: FileText, name: "Phase II Immunotherapy Protocol v3.2",   type: "Protocol",      size: "2.4 MB",  age: "3 days ago",   color: "#a78bfa" },
    { icon: FileText, name: "Q3 Assay Summary — Compound 47B",        type: "Assay Report",  size: "1.1 MB",  age: "1 week ago",   color: "#34d399" },
    { icon: File,     name: "IND Application Draft — Safety Package",  type: "Regulatory",    size: "5.2 MB",  age: "2 weeks ago",  color: "#fbbf24" },
    { icon: FileText, name: "Biomarker Analysis Report Q4",            type: "Study Summary", size: "890 KB",  age: "1 month ago",  color: "#58a6ff" },
    { icon: File,     name: "GLP Toxicology Study — 28 Day",           type: "Preclinical",   size: "3.7 MB",  age: "6 weeks ago",  color: "#f87171" },
  ];

  const [filterTab,   setFilterTab]   = useState(0);
  const [viewMode,    setViewMode]    = useState<"grid" | "list">("list");
  const [visible,     setVisible]     = useState(0);
  const [highlighted, setHighlighted] = useState(-1);
  const [cycle,       setCycle]       = useState(0);

  useEffect(() => {
    let alive = true;
    setVisible(0); setHighlighted(-1); setFilterTab(0); setViewMode("list");
    (async () => {
      await wait(300);
      for (let i = 1; i <= docs.length; i++) {
        if (!alive) return; setVisible(i); await wait(120);
      }
      // switch to grid view briefly
      await wait(800);
      if (!alive) return; setViewMode("grid");
      await wait(1000);
      if (!alive) return; setViewMode("list");
      // highlight rows
      for (let i = 0; i < docs.length; i++) {
        if (!alive) return;
        setHighlighted(i); await wait(320);
        setHighlighted(-1); await wait(60);
      }
      await wait(1600);
      if (alive) setCycle((c) => c + 1);
    })();
    return () => { alive = false; };
  }, [cycle]);

  return (
    <div className="p-5">
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {["Date", "Target"].map((t, i) => (
            <button
              key={t}
              onClick={() => setFilterTab(i)}
              className="rounded-md px-3 py-1 text-[11px] font-medium transition-all duration-200"
              style={
                filterTab === i
                  ? { background: "#58a6ff", color: "#0d1117" }
                  : { background: "rgba(22,27,34,0.6)", color: "#8b949e", border: "1px solid rgba(48,54,61,0.5)" }
              }
            >
              {t} <span style={{ opacity: 0.6 }}>0</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(48,54,61,0.5)" }}>
            <button
              onClick={() => setViewMode("grid")}
              className="p-1.5 transition-colors"
              style={{ background: viewMode === "grid" ? "rgba(88,166,255,0.15)" : "rgba(22,27,34,0.6)", color: viewMode === "grid" ? "#58a6ff" : "#8b949e" }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="p-1.5 transition-colors"
              style={{ background: viewMode === "list" ? "rgba(88,166,255,0.15)" : "rgba(22,27,34,0.6)", color: viewMode === "list" ? "#58a6ff" : "#8b949e" }}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium" style={{ background: "#58a6ff", color: "#0d1117" }}>
            <Upload className="h-3 w-3" />
            Upload
          </button>
        </div>
      </div>

      {/* Column headers (list view) */}
      {viewMode === "list" && (
        <div
          className="mb-1 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-3 py-1.5 text-[10px] font-medium"
          style={{ color: "#484f58", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
        >
          <span>Name</span>
          <span className="hidden sm:block">Type</span>
          <span className="hidden sm:block">Size</span>
          <span>Added</span>
        </div>
      )}

      {/* Documents */}
      {viewMode === "list" ? (
        <div className="space-y-0.5">
          {docs.map((d, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-lg px-3 py-2.5"
              style={{
                color: "#c9d1d9",
                opacity: i < visible ? 1 : 0,
                transform: i < visible ? "translateX(0)" : "translateX(-8px)",
                transition: "opacity 0.3s ease, transform 0.3s ease, background 0.2s ease",
                background: highlighted === i ? "rgba(88,166,255,0.07)" : "transparent",
              }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <d.icon className="h-4 w-4 flex-shrink-0" style={{ color: highlighted === i ? "#58a6ff" : d.color, transition: "color 0.2s ease" }} />
                <span className="truncate text-xs">{d.name}</span>
              </div>
              <span className="hidden flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:block" style={{ background: `${d.color}12`, color: d.color, border: `1px solid ${d.color}22` }}>{d.type}</span>
              <span className="hidden flex-shrink-0 text-[11px] tabular-nums sm:block" style={{ color: "#484f58" }}>{d.size}</span>
              <span className="flex-shrink-0 text-[11px]" style={{ color: "#484f58" }}>{d.age}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {docs.map((d, i) => (
            <div
              key={i}
              className="rounded-lg p-3"
              style={{
                background: "rgba(22,27,34,0.6)", border: "1px solid rgba(48,54,61,0.5)",
                opacity: i < visible ? 1 : 0,
                transform: i < visible ? "scale(1)" : "scale(0.92)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
              }}
            >
              <d.icon className="mb-2 h-5 w-5" style={{ color: d.color }} />
              <p className="truncate text-[11px] font-medium" style={{ color: "#e6edf3" }}>{d.name}</p>
              <p className="mt-0.5 text-[10px]" style={{ color: "#484f58" }}>{d.age}</p>
            </div>
          ))}
        </div>
      )}

      {/* Settings hint */}
      <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: "#30363d" }}>
        <Settings className="h-3 w-3" />
        Manage your uploaded documents
      </div>
    </div>
  );
}
