"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import type { AgentTrace, AgentStep } from "@docu-store/types";
import { useDevModeStore } from "@/lib/stores/dev-mode-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { AgentStepIndicator } from "./AgentStepIndicator";

interface AgentThinkingPanelProps {
  trace: AgentTrace;
  isStreaming?: boolean;
}

function getStepDuration(step: AgentStep, streamingTimings: { step: string; durationMs: number | null }[]): number | null {
  // Prefer server-side timestamps (persisted messages)
  if (step.started_at && step.completed_at) {
    return new Date(step.completed_at).getTime() - new Date(step.started_at).getTime();
  }
  // Fall back to client-side timing (streaming)
  const timing = streamingTimings.find((t) => t.step === step.step);
  return timing?.durationMs ?? null;
}

export function AgentThinkingPanel({ trace, isStreaming }: AgentThinkingPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const devMode = useDevModeStore((s) => s.enabled);
  const { stepTimings, doneEvent, rawEvents } = useChatStore();
  const steps = trace.steps;
  if (!steps.length) return null;

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalMs = trace.total_duration_ms;
  const label = isStreaming
    ? `Thinking (${completedCount}/${steps.length} steps)...`
    : `Thinking history (${completedCount} steps${totalMs ? `, ${(totalMs / 1000).toFixed(1)}s` : ""})`;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Clock className="w-3 h-3" />
        <span>{label}</span>
      </button>

      {expanded && (
        <div className="mt-1.5 ml-2 pl-3 border-l-2 border-border-subtle space-y-1.5">
          {steps.map((step, i) => (
            <AgentStepIndicator
              key={`${step.step}-${i}`}
              step={step}
              durationMs={getStepDuration(step, stepTimings)}
              devMode={devMode}
            />
          ))}
        </div>
      )}

      {/* Dev-mode: pipeline summary — works for both streaming and persisted */}
      {devMode && expanded && (
        <DevPipelineSummary
          trace={trace}
          steps={steps}
          stepTimings={stepTimings}
          doneEvent={doneEvent}
          rawEvents={rawEvents}
          isStreaming={isStreaming}
        />
      )}
    </div>
  );
}

function DevPipelineSummary({
  trace,
  steps,
  stepTimings,
  doneEvent,
  rawEvents,
  isStreaming,
}: {
  trace: AgentTrace;
  steps: AgentStep[];
  stepTimings: { step: string; durationMs: number | null }[];
  doneEvent: { duration_ms?: number | null; total_tokens?: number | null } | null;
  rawEvents: unknown[];
  isStreaming?: boolean;
}) {
  // Use server-side total or client-side doneEvent
  const totalMs = trace.total_duration_ms ?? doneEvent?.duration_ms;
  const totalTokens = doneEvent?.total_tokens;

  // Compute step durations from either source
  const durations = steps.map((s) => ({
    step: s.step,
    ms: getStepDurationInner(s, stepTimings),
    status: s.status,
  }));

  if (!totalMs && !isStreaming && durations.every((d) => d.ms === null)) return null;

  return (
    <div className="mt-2 ml-2 rounded bg-surface-elevated px-2 py-1.5 text-[10px] font-mono text-text-muted space-y-0.5">
      <div className="flex flex-wrap gap-x-3">
        <span className="font-semibold text-text-secondary">Pipeline</span>
        {totalMs != null && (
          <span>total: <span className="text-accent-text">{totalMs}ms</span></span>
        )}
        {totalTokens != null && (
          <span>tokens: <span className="text-feature-search">{totalTokens}</span></span>
        )}
        {trace.retry_count > 0 && (
          <span className="text-ds-warning">retries: {trace.retry_count}</span>
        )}
        {isStreaming && rawEvents.length > 0 && (
          <span>events: <span className="text-ds-success">{rawEvents.length}</span></span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3">
        {durations.map((d) => (
          <span key={d.step}>
            {d.step}:{" "}
            <span className={
              d.status === "completed"
                ? "text-ds-success"
                : d.status === "started"
                  ? "text-ds-warning"
                  : "text-ds-error"
            }>
              {d.ms != null ? `${d.ms}ms` : d.status === "started" ? "running..." : "—"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function getStepDurationInner(step: AgentStep, streamingTimings: { step: string; durationMs: number | null }[]): number | null {
  if (step.started_at && step.completed_at) {
    return new Date(step.completed_at).getTime() - new Date(step.started_at).getTime();
  }
  const timing = streamingTimings.find((t) => t.step === step.step);
  return timing?.durationMs ?? null;
}
