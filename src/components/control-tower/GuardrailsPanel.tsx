"use client";

import { ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import type {
  GeminiJudgeResult,
  JudgeRequestBody,
} from "@/lib/control-tower/gemini-types";
import { GUARDRAIL_CATALOG } from "@/lib/control-tower/scenarios";

import { Disclosure } from "./Disclosure";
import { JudgeResultView } from "./GeminiJudgePanel";

interface GuardrailsPanelProps {
  /**
   * Trace identity for the parent re-score request. Exactly one of
   * `scenarioId`, `runSnapshot` or `traceText` must be provided — the
   * route falls back through them in order.
   */
  remediationSource:
    | { kind: "scenario"; scenarioId: string }
    | {
        kind: "snapshot";
        runSnapshot: NonNullable<JudgeRequestBody["runSnapshot"]>;
        mission?: string;
      }
    | { kind: "pasted"; traceText: string };
  /**
   * Recommended guardrails surfaced front-and-centre — typically 4–5 for
   * the wow scenario. Anything not listed here goes into "Advanced".
   */
  recommendedGuardrails: readonly string[];
  /** Default checkboxes pre-checked when the panel opens. */
  initialSelectedGuardrails: readonly string[];
  /** Result returned by the simulation, if any — controlled by the parent. */
  afterResult: GeminiJudgeResult | null;
  /** Setter passed back to the parent so it can render the comparison. */
  onAfterResult: (result: GeminiJudgeResult | null) => void;
}

type SimState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

const MAX_RECOMMENDED = 5;

/**
 * "Recommended production guardrails" panel — V5 simplified.
 *
 *   - Up to 5 recommended guardrails visible by default (icon + label).
 *   - Everything else from the catalogue lives behind "Advanced
 *     guardrails" disclosure.
 *   - The CTA explicitly says "what-if simulation" — no "applied to
 *     production" copy.
 *   - The After-result is rendered with `collapseDetails` so the
 *     comparison stays the wow moment.
 */
export function GuardrailsPanel({
  remediationSource,
  recommendedGuardrails,
  initialSelectedGuardrails,
  afterResult,
  onAfterResult,
}: GuardrailsPanelProps) {
  const recommended = useMemo(
    () => recommendedGuardrails.slice(0, MAX_RECOMMENDED),
    [recommendedGuardrails],
  );
  const advanced = useMemo(
    () =>
      GUARDRAIL_CATALOG.filter((label) => !recommended.includes(label)),
    [recommended],
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedGuardrails),
  );
  const [state, setState] = useState<SimState>(
    afterResult ? { status: "ready" } : { status: "idle" },
  );
  const abortRef = useRef<AbortController | null>(null);
  const headingId = useId();

  // The parent forces a remount via `key` whenever the trace identity
  // changes, so we don't need an effect to sync the selection — React
  // re-runs the `useState` initializer on every fresh mount. Cleaner
  // than calling setState in an effect and avoids the React 19
  // `set-state-in-effect` lint rule.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const toggle = useCallback((label: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(label);
      else next.delete(label);
      return next;
    });
  }, []);

  const reScore = useCallback(async () => {
    if (selected.size === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });

    const body: JudgeRequestBody = {
      mode: "remediation_simulation",
      guardrails: Array.from(selected),
    };
    if (remediationSource.kind === "scenario") {
      body.scenarioId = remediationSource.scenarioId;
    } else if (remediationSource.kind === "snapshot") {
      body.runSnapshot = remediationSource.runSnapshot;
      if (remediationSource.mission) body.mission = remediationSource.mission;
    } else {
      body.traceText = remediationSource.traceText;
    }

    try {
      const res = await fetch("/api/gemini/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok: true; result: GeminiJudgeResult }
        | { ok: false; code: string; message?: string }
        | null;

      if (!res.ok || !payload || payload.ok === false) {
        const message =
          payload && payload.ok === false
            ? payload.message || "Gemini failed to re-score the run."
            : `Gemini API error (HTTP ${res.status}).`;
        setState({ status: "error", message });
        onAfterResult(null);
        return;
      }
      onAfterResult(payload.result);
      setState({ status: "ready" });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState({
        status: "error",
        message: (err as Error).message || "Failed to call Gemini.",
      });
      onAfterResult(null);
    }
  }, [selected, remediationSource, onAfterResult]);

  const cta =
    state.status === "loading"
      ? "Re-scoring…"
      : afterResult
        ? "Re-score with new guardrails"
        : "Re-score with guardrails";

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-5 rounded-xl border border-white/10 bg-white/[0.02] p-6"
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden />
          <h3
            id={headingId}
            className="text-lg font-semibold text-zinc-50"
          >
            Recommended production guardrails
          </h3>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Pick the guardrails to simulate. We re-run Gemini on the same trace
          as if these guardrails were already implemented.{" "}
          <span className="text-zinc-300">
            What-if simulation only. No backend is modified.
          </span>
        </p>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2">
        {recommended.map((label) => {
          const checked = selected.has(label);
          return (
            <li key={label}>
              <GuardrailCheckbox
                label={label}
                checked={checked}
                onChange={(c) => toggle(label, c)}
              />
            </li>
          );
        })}
      </ul>

      {advanced.length > 0 ? (
        <Disclosure label="Advanced guardrails" hint={`${advanced.length} more`}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {advanced.map((label) => {
              const checked = selected.has(label);
              return (
                <li key={label}>
                  <GuardrailCheckbox
                    label={label}
                    checked={checked}
                    onChange={(c) => toggle(label, c)}
                  />
                </li>
              );
            })}
          </ul>
        </Disclosure>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reScore}
          disabled={state.status === "loading" || selected.size === 0}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
        >
          {state.status === "loading" ? (
            <Spinner />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          {cta}
        </button>
        <span className="text-[11px] text-zinc-500">
          {selected.size} guardrail{selected.size === 1 ? "" : "s"} selected
        </span>
      </div>

      {state.status === "error" ? (
        <p
          role="status"
          className="rounded-lg border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200"
        >
          {state.message}
        </p>
      ) : null}

      {afterResult ? (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-zinc-100">
              After guardrails (what-if simulation)
            </h4>
            <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
              Simulation
            </span>
          </div>
          <JudgeResultView
            result={afterResult}
            collapseDetails
            showInfrastructureProof={false}
          />
        </div>
      ) : null}
    </section>
  );
}

function GuardrailCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={[
        "group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        "focus-within:ring-2 focus-within:ring-emerald-400/60",
        checked
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-50"
          : "border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/20",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 flex-none accent-emerald-400 focus:outline-none"
      />
      <span className="flex items-start gap-2">
        <Wrench
          aria-hidden
          className={`mt-0.5 h-3.5 w-3.5 flex-none ${checked ? "text-emerald-200" : "text-zinc-500 group-hover:text-zinc-300"}`}
        />
        <span className="leading-snug">{label}</span>
      </span>
    </label>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}
