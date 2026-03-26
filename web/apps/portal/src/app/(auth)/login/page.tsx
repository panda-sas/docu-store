"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Search,
  Atom,
  FileText,
  Bot,
  FolderOpen,
  File,
} from "lucide-react";
import { useAuthz } from "@sentinel-auth/react";
import { ShapeGrid } from "@/components/backgrounds/ShapeGrid";
/* ── Tab data ── */
const tabs = [
  {
    id: "search",
    label: "Search",
    description:
      "Find the exact data point across your entire document library using natural language.",
  },
  {
    id: "chat",
    label: "Chat",
    description:
      "Ask AI any question about your documents and get fully cited, traceable answers grounded in your data.",
  },
  {
    id: "compounds",
    label: "Compounds",
    description:
      "Query your compound library using SMILES-based structural similarity search alongside full-text queries.",
  },
  {
    id: "documents",
    label: "Documents",
    description:
      "Upload, organize, and access every protocol, report, and filing from a single structured workspace.",
  },
];

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuthz();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

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
      {/* Background canvas */}
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
          <span
            className="text-sm font-semibold tracking-wide"
            style={{ color: "#e6edf3" }}
          >
            DocuStore
          </span>
        </div>
        <a
          href="#sign-in"
          className="rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200"
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

          {/* Headline */}
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
                background:
                  "linear-gradient(135deg, #58a6ff 0%, #bc8cff 55%, #79c0ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              science
            </span>{" "}
            speak.
          </h1>

          {/* Subheadline */}
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

          {/* Sign-in Card */}
          <div
            id="sign-in"
            className="relative mx-auto mt-10 max-w-[340px] rounded-2xl p-6"
            style={{
              background: "rgba(22,27,34,0.92)",
              border: "1px solid rgba(48,54,61,0.8)",
              boxShadow:
                "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(88,166,255,0.04)",
              backdropFilter: "blur(20px)",
              animation: "auth-enter 0.7s ease-out 0.35s both",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 rounded-t-2xl"
              style={{
                height: "2px",
                background: "linear-gradient(90deg, #58a6ff, #bc8cff, #58a6ff)",
                backgroundSize: "200% 100%",
                animation: "gradient-shift 4s ease infinite",
              }}
            />
            <h2
              className="mb-0.5 text-base font-semibold"
              style={{ color: "#e6edf3" }}
            >
              Sign in to DocuStore
            </h2>
            <p className="mb-5 text-xs" style={{ color: "#8b949e" }}>
              Use your organization account to continue
            </p>
            <div className="space-y-2.5">
              <button
                disabled={!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
                onClick={() => login("google")}
                className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.96)",
                  color: "#1f2937",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                }}
              >
                <GoogleIcon />
                Continue with Google
              </button>
              <button
                disabled={!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}
                onClick={() => login("github")}
                className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "#21262d",
                  color: "#e6edf3",
                  border: "1px solid rgba(240,246,252,0.1)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }}
              >
                <GitHubIcon />
                Continue with GitHub
              </button>
              <button
                disabled={!process.env.NEXT_PUBLIC_ENTRA_ID_CLIENT_ID}
                className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium opacity-30"
                style={{
                  background: "rgba(33,38,45,0.5)",
                  color: "#8b949e",
                  border: "1px solid rgba(48,54,61,0.8)",
                }}
              >
                <MicrosoftIcon />
                Continue with Entra ID
              </button>
            </div>
            <p
              className="mt-4 text-center text-[11px]"
              style={{ color: "#484f58" }}
            >
              By signing in you agree to our terms of service
            </p>
          </div>
        </div>

        {/* Bottom gradient: hero bleeds into section 2 */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: "320px",
            background: "linear-gradient(to bottom, transparent 0%, rgba(22,27,34,0.6) 50%, #161b22 100%)",
            zIndex: 2,
          }}
        />
      </section>

      {/* ── Section 2: Tab showcase ──
       *
       * Slides up over the hero via negative margin + rounded top corners.
       * Ghost headline sits behind the large mockup card,
       * creating the GitHub "text behind rising card" depth effect.
       */}
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
        {/* Large centered atmospheric halo — the GitHub signature effect */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: "700px",
            background:
              "radial-gradient(ellipse 100% 55% at 50% 0%, rgba(139,92,246,0.18) 0%, rgba(88,166,255,0.1) 35%, transparent 70%)",
          }}
        />

        {/* ── Large mockup card ── */}
        <div className="relative mx-auto max-w-6xl px-6 pb-0 pt-16">
          {/* Bloom — diffuse colored light that makes the card float */}
          <div
            className="pointer-events-none absolute inset-x-0 top-8"
            style={{
              height: "120%",
              background:
                "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(139,92,246,0.2) 0%, rgba(88,166,255,0.12) 40%, transparent 70%)",
              zIndex: 0,
            }}
          />
          {/* Gradient border wrapper: 1px padding exposes the gradient as the border */}
          <div
            className="relative rounded-2xl p-px"
            style={{
              background:
                "linear-gradient(160deg, rgba(139,92,246,0.6) 0%, rgba(88,166,255,0.4) 25%, rgba(48,54,61,0.35) 55%, rgba(48,54,61,0.15) 100%)",
              boxShadow:
                "0 0 0 1px rgba(139,92,246,0.08), 0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(139,92,246,0.12)",
              zIndex: 1,
            }}
          >
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: "#0d1117",
              minHeight: "480px",
            }}
          >
            {/* Window chrome */}
            <div
              className="flex items-center gap-2 border-b px-5 py-3"
              style={{
                background: "#161b22",
                borderColor: "rgba(48,54,61,0.8)",
              }}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "#ff5f57" }}
              />
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "#ffc72c" }}
              />
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "#28ca41" }}
              />
              <div
                className="mx-3 flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-xs"
                style={{ background: "#0d1117", color: "#8b949e" }}
              >
                <FlaskConical
                  className="h-3 w-3"
                  style={{ color: "#484f58" }}
                />
                DocuStore ·{" "}
                <span
                  style={{
                    opacity: transitioning ? 0 : 1,
                    transition: "opacity 0.18s ease",
                  }}
                >
                  {tabs[activeTab].label}
                </span>
              </div>
            </div>

            {/* Tab panel content */}
            <div
              style={{
                opacity: transitioning ? 0 : 1,
                transform: transitioning
                  ? "translateY(8px)"
                  : "translateY(0)",
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

        {/* ── Tab bar + description (below card, matching GitHub layout) ── */}
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
                    ? {
                        background: "rgba(22,27,34,0.9)",
                        color: "#e6edf3",
                        border: "1px solid rgba(240,246,252,0.15)",
                      }
                    : {
                        background: "transparent",
                        color: "#8b949e",
                        border: "1px solid transparent",
                      }
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
            <span className="text-xs" style={{ color: "#484f58" }}>
              DocuStore · DAIKON
            </span>
          </div>
          <p className="text-[11px]" style={{ color: "#30363d" }}>
            &copy; 2026 DocuStore. All rights reserved.
          </p>
        </footer>
      </section>
    </div>
  );
}

/* ── Shared animation helper ── */
function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/* ══════════════════════════════════════════
   Tab panels — self-animating loops
   ══════════════════════════════════════════ */

function SearchPanel() {
  const QUERY = "immunotherapy dose escalation protocol";
  const results = [
    { type: "Protocol",     typeColor: "#a78bfa", title: "Phase II Immunotherapy Protocol v3.2", snippet: "CD8+ T-cell activation observed at 48h post-treatment. Dose escalation to 10 mg/kg recommended based on preliminary data.", score: 0.94 },
    { type: "Assay Report", typeColor: "#34d399", title: "Q3 Assay Summary — Compound 47B",       snippet: "IC50 measurements confirm 12 nM inhibition. Structural analogs show reduced off-target binding at the ATP-binding site.", score: 0.87 },
    { type: "Regulatory",   typeColor: "#fbbf24", title: "IND Application Draft — Safety Package", snippet: "28-day toxicity study supports the proposed starting dose. No adverse findings at therapeutic exposure levels.", score: 0.81 },
    { type: "Study Summary",typeColor: "#58a6ff", title: "Biomarker Analysis Report — Q4",         snippet: "PD-L1 expression correlates with response rate at 0.78 Pearson coefficient. Subset analysis for high expressors shows 62% ORR.", score: 0.76 },
  ];

  const [typed, setTyped]   = useState(0);
  const [visible, setVisible] = useState(0);
  const [blink, setBlink]   = useState(true);
  const [cycle, setCycle]   = useState(0);

  useEffect(() => {
    const id = setInterval(() => setBlink(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    setTyped(0);
    setVisible(0);
    (async () => {
      await wait(400);
      for (let i = 1; i <= QUERY.length; i++) {
        if (!alive) return;
        setTyped(i);
        await wait(36);
      }
      for (let i = 1; i <= results.length; i++) {
        if (!alive) return;
        await wait(270);
        setVisible(i);
      }
      await wait(2800);
      if (alive) setCycle(c => c + 1);
    })();
    return () => { alive = false; };
  }, [cycle]);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "#161b22", border: "1px solid rgba(88,166,255,0.35)", boxShadow: "0 0 12px rgba(88,166,255,0.06)" }}>
        <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#58a6ff" }} />
        <span className="text-sm" style={{ color: "#e6edf3" }}>
          {QUERY.slice(0, typed)}
          <span style={{ display: "inline-block", width: "1px", height: "0.85em", background: "#58a6ff", verticalAlign: "text-bottom", marginLeft: "1px", opacity: blink ? 1 : 0, transition: "opacity 0.1s" }} />
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((r, i) => (
          <div key={i} className="rounded-lg p-3.5" style={{ background: "rgba(22,27,34,0.6)", border: "1px solid rgba(48,54,61,0.5)", opacity: i < visible ? 1 : 0, transform: i < visible ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.35s ease, transform 0.35s ease" }}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${r.typeColor}15`, color: r.typeColor, border: `1px solid ${r.typeColor}25` }}>{r.type}</span>
                <span className="truncate text-xs font-medium" style={{ color: "#e6edf3" }}>{r.title}</span>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold tabular-nums" style={{ color: r.score > 0.9 ? "#34d399" : r.score > 0.85 ? "#58a6ff" : "#a78bfa" }}>{Math.round(r.score * 100)}%</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "#8b949e" }}>{r.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel() {
  const USER_MSG = "What were the key efficacy findings from the Phase II immunotherapy trial?";
  const AI_INTRO = "Based on the Phase II Immunotherapy Protocol v3.2 [1], the key efficacy findings were:";
  const bullets = [
    "CD8+ T-cell activation confirmed at 48h post-treatment across all dose cohorts",
    "Overall response rate of 54% at the 10 mg/kg dose level [1]",
    "Median progression-free survival of 8.3 months, exceeding the 6-month benchmark [2]",
    "PD-L1 high expressors showed 62% ORR vs 31% in PD-L1 low group [3]",
  ];
  const sources = [
    { label: "Phase II Protocol v3.2", color: "#a78bfa" },
    { label: "Q3 Clinical Summary",    color: "#58a6ff" },
    { label: "Biomarker Analysis Q4",  color: "#34d399" },
  ];

  const [showUser,      setShowUser]      = useState(false);
  const [showThinking,  setShowThinking]  = useState(false);
  const [showAi,        setShowAi]        = useState(false);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [visibleSources, setVisibleSources] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let alive = true;
    setShowUser(false); setShowThinking(false); setShowAi(false);
    setVisibleBullets(0); setVisibleSources(0);
    (async () => {
      await wait(350);
      if (!alive) return; setShowUser(true);
      await wait(1000);
      if (!alive) return; setShowThinking(true);
      await wait(1300);
      if (!alive) return; setShowThinking(false); setShowAi(true);
      await wait(500);
      for (let i = 1; i <= bullets.length; i++) {
        if (!alive) return;
        setVisibleBullets(i);
        await wait(360);
      }
      for (let i = 1; i <= sources.length; i++) {
        if (!alive) return;
        setVisibleSources(i);
        await wait(230);
      }
      await wait(2500);
      if (alive) setCycle(c => c + 1);
    })();
    return () => { alive = false; };
  }, [cycle]);

  return (
    <div className="p-6">
      <div className="space-y-4">
        {/* User message */}
        <div className="flex justify-end" style={{ opacity: showUser ? 1 : 0, transform: showUser ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.4s ease, transform 0.4s ease" }}>
          <div className="max-w-md rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm" style={{ background: "rgba(88,166,255,0.15)", color: "#e6edf3", border: "1px solid rgba(88,166,255,0.2)" }}>
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
              {[0, 1, 2].map(d => (
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

      <div className="mt-5 flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "#161b22", border: "1px solid rgba(48,54,61,0.8)" }}>
        <span className="flex-1 text-sm" style={{ color: "#484f58" }}>Ask a question about your documents…</span>
        <div className="rounded px-2.5 py-1 text-xs font-medium" style={{ background: "rgba(88,166,255,0.15)", color: "#58a6ff" }}>↵ Send</div>
      </div>
    </div>
  );
}

function CompoundsPanel() {
  const SMILES = "CC(C)(C)c1cc(NC(=O)c2ccc(F)cc2)ccc1";
  const compounds = [
    { id: "CPD-047B", name: "Compound 47B",   similarity: 1.00, smiles: "CC(C)(C)c1cc(NC(=O)c2ccc(F)cc2)ccc1",  mw: "327.4", activity: "12 nM", color: "#34d399" },
    { id: "CPD-023A", name: "Compound 23A",   similarity: 0.91, smiles: "CC(C)(C)c1cc(NC(=O)c2ccc(Cl)cc2)ccc1", mw: "343.8", activity: "34 nM", color: "#58a6ff" },
    { id: "CPD-088C", name: "Lead Candidate", similarity: 0.86, smiles: "CC(C)(C)c1cc(NC(=O)c2cccc(F)c2)ccc1",  mw: "327.4", activity: "28 nM", color: "#a78bfa" },
    { id: "CPD-012D", name: "Analog Series D",similarity: 0.79, smiles: "CCC(C)c1cc(NC(=O)c2ccc(F)cc2)ccc1",   mw: "313.4", activity: "89 nM", color: "#fbbf24" },
  ];

  const [typed,   setTyped]   = useState(0);
  const [visible, setVisible] = useState(0);
  const [blink,   setBlink]   = useState(true);
  const [cycle,   setCycle]   = useState(0);

  useEffect(() => {
    const id = setInterval(() => setBlink(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    setTyped(0); setVisible(0);
    (async () => {
      await wait(300);
      for (let i = 1; i <= SMILES.length; i++) {
        if (!alive) return;
        setTyped(i);
        await wait(28);
      }
      for (let i = 1; i <= compounds.length; i++) {
        if (!alive) return;
        await wait(260);
        setVisible(i);
      }
      await wait(2800);
      if (alive) setCycle(c => c + 1);
    })();
    return () => { alive = false; };
  }, [cycle]);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "#161b22", border: "1px solid rgba(52,211,153,0.35)", boxShadow: "0 0 12px rgba(52,211,153,0.05)" }}>
        <Atom className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#34d399" }} />
        <span className="font-mono text-xs" style={{ color: "#e6edf3" }}>
          {SMILES.slice(0, typed)}
          <span style={{ display: "inline-block", width: "1px", height: "0.85em", background: "#34d399", verticalAlign: "text-bottom", marginLeft: "1px", opacity: blink ? 1 : 0, transition: "opacity 0.1s" }} />
        </span>
        {typed >= SMILES.length && (
          <span className="ml-auto flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)", animation: "auth-enter 0.3s ease both" }}>SMILES</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {compounds.map((c, i) => (
          <div key={c.id} className="rounded-lg p-3.5" style={{ background: "rgba(22,27,34,0.6)", border: "1px solid rgba(48,54,61,0.5)", opacity: i < visible ? 1 : 0, transform: i < visible ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.35s ease, transform 0.35s ease" }}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                <span className="text-xs font-semibold" style={{ color: "#e6edf3" }}>{c.name}</span>
                <span className="text-[10px]" style={{ color: "#484f58" }}>{c.id}</span>
              </div>
              <span className="text-xs font-semibold tabular-nums" style={{ color: c.color }}>{Math.round(c.similarity * 100)}%</span>
            </div>
            <p className="mb-2 truncate font-mono text-[10px]" style={{ color: "#8b949e" }}>{c.smiles}</p>
            <div className="flex gap-3">
              <span className="text-[11px]" style={{ color: "#8b949e" }}>MW <span style={{ color: "#c9d1d9" }}>{c.mw}</span></span>
              <span className="text-[11px]" style={{ color: "#8b949e" }}>IC50 <span style={{ color: c.color }}>{c.activity}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsPanel() {
  const docs = [
    { icon: FileText,   name: "Phase II Immunotherapy Protocol v3.2", type: "Protocol",     size: "2.4 MB",  age: "3 days ago",   color: "#a78bfa" },
    { icon: FileText,   name: "Q3 Assay Summary — Compound 47B",      type: "Assay Report", size: "1.1 MB",  age: "1 week ago",   color: "#34d399" },
    { icon: File,       name: "IND Application Draft — Safety Package",type: "Regulatory",  size: "5.2 MB",  age: "2 weeks ago",  color: "#fbbf24" },
    { icon: FileText,   name: "Biomarker Analysis Report Q4",          type: "Study Summary",size: "890 KB",  age: "1 month ago",  color: "#58a6ff" },
    { icon: File,       name: "GLP Toxicology Study — 28 Day",         type: "Preclinical",  size: "3.7 MB",  age: "6 weeks ago",  color: "#f87171" },
    { icon: FolderOpen, name: "Clinical Data Package — Cohort 2",      type: "Clinical",     size: "12.1 MB", age: "2 months ago", color: "#fb923c" },
  ];

  const [visible,      setVisible]      = useState(0);
  const [highlighted,  setHighlighted]  = useState(-1);
  const [cycle,        setCycle]        = useState(0);

  useEffect(() => {
    let alive = true;
    setVisible(0); setHighlighted(-1);
    (async () => {
      await wait(300);
      for (let i = 1; i <= docs.length; i++) {
        if (!alive) return;
        setVisible(i);
        await wait(130);
      }
      // pulse each row briefly
      for (let i = 0; i < docs.length; i++) {
        if (!alive) return;
        setHighlighted(i);
        await wait(340);
        setHighlighted(-1);
        await wait(80);
      }
      await wait(1800);
      if (alive) setCycle(c => c + 1);
    })();
    return () => { alive = false; };
  }, [cycle]);

  return (
    <div className="p-6">
      <div className="mb-3 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-3 py-2 text-[11px] font-medium" style={{ color: "#484f58", borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
        <span>Name</span>
        <span className="hidden sm:block">Type</span>
        <span className="hidden sm:block">Size</span>
        <span>Added</span>
      </div>
      <div className="space-y-0.5">
        {docs.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-lg px-3 py-2.5" style={{
            color: "#c9d1d9",
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? "translateX(0)" : "translateX(-8px)",
            transition: "opacity 0.3s ease, transform 0.3s ease, background 0.2s ease",
            background: highlighted === i ? "rgba(88,166,255,0.07)" : "transparent",
          }}>
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
    </div>
  );
}

/* ── OAuth Provider Icons ── */

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px] flex-shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-[18px] w-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
