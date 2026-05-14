"use client";

import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  DollarSign,
  Eye,
  FileWarning,
  ListChecks,
  OctagonX,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  GeminiJudgeResult,
  GeminiRisk,
  GeminiVerdict,
  JudgeRequestBody,
} from "@/lib/control-tower/gemini-types";

import { Disclosure } from "./Disclosure";

interface GeminiJudgePanelProps {
  /**
   * The body the panel will POST to /api/gemini/judge when the user
   * clicks the action button. When `null`, the button is disabled and
   * an empty-state message is rendered.
   */
  requestBody: JudgeRequestBody | null;
  /**
   * Optional callback fired once the judge returns a parseable result.
   * Used by the parent to show the guardrails / re-score panel.
   */
  onResult?: (result: GeminiJudgeResult) => void;
  /** When true, force the panel to a disabled state (e.g. parent loading). */
  disabledOverride?: boolean;
  /** Override the action button label. Defaults to the V3 wording. */
  actionLabel?: string;
  /**
   * What to display when the panel has no request to send (e.g. the user
   * has not picked a run yet). Defaults to the V3 wording.
   */
  emptyHint?: string;
}

interface CapabilitiesResponse {
  gemini: { available: boolean; model: string | null };
}

type JudgeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: GeminiJudgeResult }
  | { status: "error"; message: string };

// Lot 1b (P0#6) — soft minimum window for the ticker animation so the
// jury sees the 5-step narration even when Gemini is fast (sub-2s).
const TICKER_MIN_DURATION_MS = 2000;

export function GeminiJudgePanel({
  requestBody,
  onResult,
  disabledOverride,
  actionLabel,
  emptyHint,
}: GeminiJudgePanelProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [state, setState] = useState<JudgeState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Discover availability at mount. Failures default to "not available" so
  // we never render a half-broken panel when /api/capabilities is down.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/capabilities", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as CapabilitiesResponse;
        if (cancelled) return;
        setAvailable(Boolean(data.gemini?.available));
        setModel(data.gemini?.model ?? null);
      } catch {
        if (!cancelled) {
          setAvailable(false);
          setModel(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cancel any in-flight judge request when the component unmounts.
  // The parent forces a remount via `key` whenever the input identity
  // changes (new scenario, reset), so we don't need an effect to reset
  // state here — that would be a `set-state-in-effect` anti-pattern.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (minDurationTimerRef.current) {
        clearTimeout(minDurationTimerRef.current);
        minDurationTimerRef.current = null;
      }
    };
  }, []);

  const runJudge = useCallback(async () => {
    if (!requestBody) return;
    abortRef.current?.abort();
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = Date.now();
    setState({ status: "loading" });

    // Lot 1b — keep the loading state visible at least
    // TICKER_MIN_DURATION_MS so the 5-step ticker is always perceivable
    // by the jury, even when Gemini answers in <2s. We never *delay*
    // the result past Gemini's actual latency once the floor is past.
    const finalize = (next: JudgeState) => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, TICKER_MIN_DURATION_MS - elapsed);
      if (remaining === 0) {
        setState(next);
        if (next.status === "ready") onResult?.(next.result);
        return;
      }
      minDurationTimerRef.current = setTimeout(() => {
        minDurationTimerRef.current = null;
        // Bail out if the request was cancelled while we were waiting.
        if (controller.signal.aborted) return;
        setState(next);
        if (next.status === "ready") onResult?.(next.result);
      }, remaining);
    };

    try {
      const res = await fetch("/api/gemini/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
            ? payload.message || friendlyCodeMessage(payload.code)
            : `Gemini API error (HTTP ${res.status}).`;
        finalize({ status: "error", message });
        return;
      }
      finalize({ status: "ready", result: payload.result });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      finalize({
        status: "error",
        message: (err as Error).message || "Failed to call Gemini.",
      });
    }
  }, [requestBody, onResult]);

  // While we are still discovering availability, render nothing — avoids
  // a flash of "not configured" on slow networks.
  if (available === null) return null;

  if (!available) {
    // Lot 1b (P1#40) — single-sentence, action-oriented copy aligned on
    // the wording the master plan demands. The verbose paragraph that
    // used to live here drowned the call-to-action.
    return (
      <aside
        aria-label="Gemini reliability agent availability"
        className="flex flex-col gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-xs text-zinc-400"
      >
        <div>
          <JudgeModeBadge live={false} />
        </div>
        <p className="leading-relaxed">
          Demo running in deterministic replay mode. Set{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-zinc-300">
            GEMINI_API_KEY
          </code>{" "}
          to enable live Gemini audit.
        </p>
      </aside>
    );
  }

  const disabled =
    Boolean(disabledOverride) || !requestBody || state.status === "loading";

  return (
    <section
      aria-label="Gemini reliability agent"
      className="flex flex-col gap-5 rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/[0.06] via-white/[0.02] to-blue-500/[0.06] p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
              <Sparkles className="h-3 w-3" aria-hidden />
              Powered by Gemini
            </span>
            <JudgeModeBadge live />
            {model ? (
              <span className="font-mono text-[10px] text-zinc-500">
                {model}
              </span>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold text-zinc-50">
            Gemini Reliability Agent
          </h3>
          <p className="max-w-xl text-sm text-zinc-400">
            Gemini audits the full ArcadeOps trace and applies production
            policies — tools, sub-agents, costs, approvals and risky outputs.
          </p>
          <p className="max-w-xl text-[11px] leading-relaxed text-zinc-500">
            Deterministic replay is used for the timeline so the demo is
            reproducible. When{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-zinc-300">
              GEMINI_API_KEY
            </code>{" "}
            is configured, the same trace is audited server-side by Gemini.
          </p>
        </div>

        <button
          type="button"
          onClick={runJudge}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:cursor-not-allowed disabled:bg-violet-500/40"
        >
          {state.status === "loading" ? (
            <>
              <Spinner /> Auditing run…
            </>
          ) : state.status === "ready" ? (
            "Re-run production gate"
          ) : (
            actionLabel ?? "Run production gate"
          )}
        </button>
      </header>

      {!requestBody ? (
        <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
          {emptyHint ??
            "Choose a run, replay the safe sample, or paste a trace — Gemini needs evidence before it can judge."}
        </p>
      ) : null}

      {state.status === "loading" ? <GeminiTicker /> : null}

      {state.status === "error" ? (
        <p
          role="status"
          className="rounded-lg border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <JudgeResultView result={state.result} />
      ) : null}
    </section>
  );
}

interface JudgeResultViewProps {
  result: GeminiJudgeResult;
  /**
   * When true, the view starts as a small summary (decision card + delta-
   * only) and the rest lives behind a single disclosure. Used by the
   * "After guardrails" panel to keep the comparison the wow moment.
   */
  collapseDetails?: boolean;
}

/**
 * Decision-first result renderer.
 *
 *   - Top: big decision card (score + verdict + reason + next action).
 *   - Mid: top 3 risks + 3 mini assessments (cost / tools / observability).
 *   - Bottom: missing evidence top 3 + remediation top 4.
 *   - Everything else (full risks, full assessments, business value, full
 *     missing/remediation lists) lives behind progressive disclosure.
 *
 * Pure (no fetches, no state) so it can be mounted twice for the
 * before/after comparison.
 */
export function JudgeResultView({
  result,
  collapseDetails = false,
}: JudgeResultViewProps) {
  const sortedRisks = [...result.risks].sort(
    (a, b) => severityOrder(b.severity) - severityOrder(a.severity),
  );
  const topRisks = sortedRisks.slice(0, 3);
  const remainingRisks = sortedRisks.slice(3);

  const topMissing = result.missingEvidence.slice(0, 3);
  const remainingMissing = result.missingEvidence.slice(3);

  const topRemediation = result.remediationPlan.slice(0, 4);
  const remainingRemediation = result.remediationPlan.slice(4);

  const detailSections = (
    <>
      {/* Production policy gate details — only when triggered. */}
      {result.policyGate?.triggered && result.policyGate.rules.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionTitle>ArcadeOps production gates</SectionTitle>
          <Disclosure
            label={`${result.policyGate.rules.length} non-negotiable rule${
              result.policyGate.rules.length === 1 ? "" : "s"
            } triggered`}
            hint="Server-enforced"
            variant="card"
          >
            <ul className="flex flex-col gap-2">
              {result.policyGate.rules.map((rule) => (
                <li
                  key={rule.id}
                  className={`rounded-md border p-3 ${
                    rule.severity === "high"
                      ? "border-red-400/30 bg-red-400/[0.06]"
                      : "border-amber-400/30 bg-amber-400/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={`h-3.5 w-3.5 flex-none ${
                        rule.severity === "high"
                          ? "text-red-300"
                          : "text-amber-300"
                      }`}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-zinc-100">
                      {rule.label}
                    </span>
                    <span
                      className={`ml-auto text-[10px] font-semibold uppercase tracking-wider ${
                        rule.severity === "high"
                          ? "text-red-300"
                          : "text-amber-300"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                    {rule.reason}
                  </p>
                </li>
              ))}
            </ul>
          </Disclosure>
        </section>
      ) : null}

      {/* Top risks — decision-first */}
      {topRisks.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <SectionTitle>Top risks</SectionTitle>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Top {topRisks.length} of {sortedRisks.length}
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {topRisks.map((risk, idx) => (
              <li key={`${risk.category}-${idx}`}>
                <RiskCard risk={risk} />
              </li>
            ))}
          </ul>
          {remainingRisks.length > 0 ? (
            <Disclosure
              label="View all risks"
              hint={`${sortedRisks.length} total`}
            >
              <ul className="grid gap-2 sm:grid-cols-2">
                {remainingRisks.map((risk, idx) => (
                  <li key={`extra-${risk.category}-${idx}`}>
                    <RiskCard risk={risk} />
                  </li>
                ))}
              </ul>
            </Disclosure>
          ) : null}
        </section>
      ) : null}

      {/* Compact assessments + full audit details disclosure */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Audit highlights</SectionTitle>
        <div className="grid gap-2 md:grid-cols-3">
          <AssessmentCard
            label="Cost"
            icon={DollarSign}
            body={firstSentence(result.costAssessment)}
          />
          <AssessmentCard
            label="Tool safety"
            icon={Wrench}
            body={firstSentence(result.toolSafetyAssessment)}
          />
          <AssessmentCard
            label="Observability"
            icon={Eye}
            body={firstSentence(result.observabilityAssessment)}
          />
        </div>

        <Disclosure label="View full audit details">
          <div className="flex flex-col gap-3">
            <FullAssessment
              label="Cost"
              body={result.costAssessment}
              icon={DollarSign}
            />
            <FullAssessment
              label="Tool safety"
              body={result.toolSafetyAssessment}
              icon={Wrench}
            />
            <FullAssessment
              label="Observability"
              body={result.observabilityAssessment}
              icon={Eye}
            />
            {result.businessValue ? (
              <FullAssessment
                label="Business value"
                body={result.businessValue}
                icon={ListChecks}
              />
            ) : null}
          </div>
        </Disclosure>
      </section>

      {/* Missing evidence + remediation plan side by side */}
      <section className="grid gap-4 md:grid-cols-2">
        {topMissing.length > 0 ? (
          <div className="flex flex-col gap-2">
            <SectionTitle>Missing evidence</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {topMissing.map((m, i) => (
                <MissingItem key={i} text={m} />
              ))}
            </ul>
            {remainingMissing.length > 0 ? (
              <Disclosure
                label="View all missing evidence"
                hint={`${result.missingEvidence.length} total`}
              >
                <ul className="flex flex-col gap-1.5">
                  {remainingMissing.map((m, i) => (
                    <MissingItem key={`extra-${i}`} text={m} />
                  ))}
                </ul>
              </Disclosure>
            ) : null}
          </div>
        ) : null}

        {topRemediation.length > 0 ? (
          <div className="flex flex-col gap-2">
            <SectionTitle>Remediation plan</SectionTitle>
            <ol className="flex flex-col gap-1.5">
              {topRemediation.map((step, i) => (
                <RemediationStep key={i} index={i + 1} text={step} />
              ))}
            </ol>
            {remainingRemediation.length > 0 ? (
              <Disclosure
                label="View full remediation plan"
                hint={`${result.remediationPlan.length} total`}
              >
                <ol className="flex flex-col gap-1.5">
                  {remainingRemediation.map((step, i) => (
                    <RemediationStep
                      key={`extra-${i}`}
                      index={i + 5}
                      text={step}
                    />
                  ))}
                </ol>
              </Disclosure>
            ) : null}
          </div>
        ) : null}
      </section>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <DecisionCard result={result} />

      {collapseDetails ? (
        <Disclosure
          label="View after-guardrails audit"
          hint={`${sortedRisks.length} risk${sortedRisks.length === 1 ? "" : "s"}`}
          variant="card"
        >
          {detailSections}
        </Disclosure>
      ) : (
        detailSections
      )}
    </div>
  );
}

/* ---------- Decision card ---------- */

function DecisionCard({ result }: { result: GeminiJudgeResult }) {
  const meta = verdictPalette(result.verdict);
  const Icon = meta.Icon;
  const reason = firstSentence(result.summary);
  const nextAction = firstSentence(result.executiveDecision);
  const policyGate = result.policyGate;
  const firstRule = policyGate?.rules?.[0];

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${meta.cardBorder} ${meta.cardBg}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl ${meta.aura}`}
      />
      <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <ScoreDial score={result.readinessScore} verdict={result.verdict} />
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${meta.classes}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {meta.label}
            </span>
            {policyGate?.triggered && firstRule ? (
              <PolicyGateBadge
                label={firstRule.label}
                severity={firstRule.severity}
                extraCount={Math.max(0, policyGate.rules.length - 1)}
              />
            ) : null}
            <CopyAuditReportButton result={result} />
          </div>

          {reason ? (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Reason
              </div>
              <p className="text-sm leading-relaxed text-zinc-100">{reason}</p>
            </div>
          ) : null}

          {nextAction ? (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Next action
              </div>
              <p className="text-sm leading-relaxed text-zinc-200">
                {nextAction}
              </p>
            </div>
          ) : null}

          {policyGate?.triggered && policyGate.rules.length > 0 ? (
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Gemini provided the audit. ArcadeOps applied non-negotiable
              production gates.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ---------- Copy audit report ---------- */

/**
 * Small "Copy audit report" button rendered next to the verdict badge.
 * Generates a plain-text summary of the verdict, score, top risks and
 * recommended remediation. Useful for hackathon judges who want to drop
 * the result into a Slack thread or a video script.
 */
function CopyAuditReportButton({ result }: { result: GeminiJudgeResult }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onClick = useCallback(async () => {
    try {
      const report = formatAuditReport(result);
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(report);
      } else {
        // Fallback: surface the text in a hidden textarea + execCommand.
        // navigator.clipboard is missing on some legacy browsers.
        const ta = document.createElement("textarea");
        ta.value = report;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Swallow — the worst case is the user not getting confirmation.
      // We deliberately do not surface a toast for a copy failure.
    }
  }, [result]);

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      aria-label="Copy audit report to clipboard"
      className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" aria-hidden />
          Audit report copied.
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3 w-3" aria-hidden />
          Copy audit report
        </>
      )}
    </button>
  );
}

/**
 * Build the plain-text audit report copied by `CopyAuditReportButton`.
 * Exported so the same function can be reused in tests or in a future
 * "share via email" CTA. Pure (no I/O, no DOM).
 */
export function formatAuditReport(result: GeminiJudgeResult): string {
  const verdictLabel: Record<GeminiVerdict, string> = {
    ready: "READY",
    needs_review: "NEEDS REVIEW",
    blocked: "BLOCKED",
  };
  const lines: string[] = [];
  lines.push("ArcadeOps Control Tower Audit");
  lines.push("");
  lines.push(`Verdict: ${verdictLabel[result.verdict]}`);
  lines.push(`Readiness: ${result.readinessScore}/100`);
  if (result.executiveDecision) {
    lines.push(`Next action: ${result.executiveDecision.trim()}`);
  }
  lines.push("");

  if (result.policyGate?.triggered && result.policyGate.rules.length > 0) {
    lines.push("Production gates triggered:");
    for (const rule of result.policyGate.rules) {
      lines.push(`- [${rule.severity.toUpperCase()}] ${rule.label}`);
    }
    lines.push("");
  }

  const sortedRisks = [...result.risks].sort(
    (a, b) => severityOrder(b.severity) - severityOrder(a.severity),
  );
  if (sortedRisks.length > 0) {
    lines.push("Critical risks:");
    for (const risk of sortedRisks.slice(0, 6)) {
      lines.push(`- [${risk.severity.toUpperCase()}] ${risk.finding}`);
    }
    lines.push("");
  }

  if (result.missingEvidence.length > 0) {
    lines.push("Missing evidence:");
    for (const m of result.missingEvidence.slice(0, 5)) {
      lines.push(`- ${m}`);
    }
    lines.push("");
  }

  if (result.remediationPlan.length > 0) {
    lines.push("Recommended remediation:");
    for (const step of result.remediationPlan.slice(0, 6)) {
      lines.push(`- ${step}`);
    }
    lines.push("");
  }

  lines.push("Generated by ArcadeOps Control Tower (Gemini Reliability Agent).");
  return lines.join("\n");
}

function PolicyGateBadge({
  label,
  severity,
  extraCount,
}: {
  label: string;
  severity: "medium" | "high";
  extraCount: number;
}) {
  const tone =
    severity === "high"
      ? "border-red-400/40 bg-red-500/15 text-red-100"
      : "border-amber-400/40 bg-amber-500/15 text-amber-100";
  return (
    <span
      role="status"
      aria-label={`Production policy gate triggered: ${label}`}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone}`}
    >
      <ShieldAlert className="h-3 w-3 flex-none" aria-hidden />
      <span className="truncate">Policy gate: {label}</span>
      {extraCount > 0 ? (
        <span className="ml-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-mono normal-case tracking-normal text-zinc-200">
          +{extraCount}
        </span>
      ) : null}
    </span>
  );
}

function ScoreDial({
  score,
  verdict,
}: {
  score: number;
  verdict: GeminiVerdict;
}) {
  const palette = verdictPalette(verdict);
  const angle = Math.max(0, Math.min(360, (score / 100) * 360));
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative grid h-28 w-28 place-items-center rounded-full sm:h-32 sm:w-32"
        style={{
          background: `conic-gradient(${palette.dial} ${angle}deg, rgba(255,255,255,0.08) ${angle}deg)`,
        }}
        aria-label={`Readiness score ${score} out of 100`}
        role="img"
      >
        <div className="grid h-[78%] w-[78%] place-items-center rounded-full bg-zinc-950">
          <div className="text-center">
            <div className="font-mono text-3xl font-semibold text-zinc-50 sm:text-4xl">
              {score}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">
              / 100
            </div>
          </div>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">
        Readiness
      </span>
    </div>
  );
}

/* ---------- Risks / assessments / missing / remediation ---------- */

function RiskCard({ risk }: { risk: GeminiRisk }) {
  const sev = severityPalette(risk.severity);
  return (
    <article className={`rounded-lg border ${sev.border} ${sev.bg} p-3`}>
      <header className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${sev.text}`}
        >
          {risk.severity} · {risk.category.replace("_", " ")}
        </span>
      </header>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-zinc-100">
        {risk.finding}
      </p>
      {risk.evidence ? (
        <p className="mt-1 line-clamp-2 text-xs italic text-zinc-400">
          Evidence: {risk.evidence}
        </p>
      ) : null}
    </article>
  );
}

function AssessmentCard({
  label,
  body,
  icon: Icon,
}: {
  label: string;
  body: string;
  icon: typeof DollarSign;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-200">
        {body && body.length > 0 ? (
          body
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </p>
    </div>
  );
}

function FullAssessment({
  label,
  body,
  icon: Icon,
}: {
  label: string;
  body: string;
  icon: typeof DollarSign;
}) {
  if (!body) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-200">{body}</p>
    </div>
  );
}

function MissingItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-zinc-300">
      <FileWarning
        aria-hidden
        className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-300"
      />
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}

function RemediationStep({ index, text }: { index: number; text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-zinc-200">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-400/20 font-mono text-[10px] font-semibold text-emerald-200"
      >
        {index}
      </span>
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </h4>
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

/**
 * Lot 1b (P0#6) — narrative ticker shown while Gemini is auditing.
 * Cycles through the 5 step messages every 600ms (full loop ~3s,
 * matches the master plan's "2-4s animation" requirement). Each step
 * is always rendered so the jury sees the whole pipeline; the active
 * step is highlighted, prior steps are dimmed but checked, future
 * steps are muted. The cycle wraps so the ticker keeps moving even
 * when Gemini takes longer than 3s on cold latency.
 */
const TICKER_MESSAGES: readonly string[] = [
  "Reading agent trace…",
  "Checking tool calls…",
  "Detecting external side effects…",
  "Applying production policies…",
  "Generating Gemini verdict…",
];
const TICKER_STEP_MS = 600;

function GeminiTicker() {
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % TICKER_MESSAGES.length);
    }, TICKER_STEP_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Gemini audit in progress"
      className="flex flex-col gap-1.5 rounded-lg border border-violet-400/20 bg-violet-500/[0.06] px-4 py-3"
    >
      {TICKER_MESSAGES.map((msg, i) => {
        const isActive = i === activeIdx;
        const isPast = i < activeIdx;
        return (
          <div
            key={msg}
            className={[
              "flex items-center gap-2 text-xs transition-colors",
              isActive
                ? "text-violet-100"
                : isPast
                  ? "text-zinc-400"
                  : "text-zinc-600",
            ].join(" ")}
          >
            <span aria-hidden className="inline-flex h-3.5 w-3.5 flex-none items-center justify-center">
              {isActive ? (
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-violet-300" />
              ) : isPast ? (
                <Check className="h-3 w-3 text-emerald-300" aria-hidden />
              ) : (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/15" />
              )}
            </span>
            <span className="font-mono text-[11px]">{msg}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Tiny pill that surfaces, at a glance, whether the next "Run production
 * gate" click will hit live Gemini server-side, or whether the panel is
 * stuck on deterministic replay (no GEMINI_API_KEY). A judge should know
 * within one second which mode is in use.
 */
function JudgeModeBadge({ live }: { live: boolean }) {
  if (live) {
    return (
      <span
        aria-label="Live Gemini audit mode"
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200"
      >
        <Zap className="h-3 w-3" aria-hidden />
        Mode: Live Gemini audit
      </span>
    );
  }
  return (
    <span
      aria-label="Deterministic replay mode"
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300"
    >
      <Radio className="h-3 w-3" aria-hidden />
      Mode: Deterministic replay
    </span>
  );
}

/* ---------- Helpers ---------- */

/**
 * Take only the first sentence of a Gemini paragraph for the compact
 * view. Falls back to a 220-char clamp so it never wraps to 4 lines.
 */
function firstSentence(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const match = trimmed.match(/.+?[.!?](?=\s|$)/);
  const candidate = match ? match[0] : trimmed;
  return candidate.length > 220
    ? `${candidate.slice(0, 217).trimEnd()}…`
    : candidate;
}

function severityOrder(sev: GeminiRisk["severity"]): number {
  switch (sev) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

export function verdictPalette(verdict: GeminiVerdict): {
  label: string;
  classes: string;
  cardBorder: string;
  cardBg: string;
  aura: string;
  dial: string;
  Icon: typeof OctagonX;
} {
  switch (verdict) {
    case "ready":
      return {
        label: "Ready with monitoring",
        classes: "bg-emerald-400/15 text-emerald-200",
        cardBorder: "border-emerald-400/30",
        cardBg: "bg-emerald-400/[0.05]",
        aura: "bg-emerald-400/20",
        dial: "rgb(52, 211, 153)",
        Icon: ShieldCheck,
      };
    case "blocked":
      return {
        label: "Blocked — do not ship",
        classes: "bg-red-500/20 text-red-100",
        cardBorder: "border-red-400/40",
        cardBg: "bg-red-400/[0.06]",
        aura: "bg-red-500/20",
        dial: "rgb(248, 113, 113)",
        Icon: OctagonX,
      };
    case "needs_review":
    default:
      return {
        label: "Needs review",
        classes: "bg-amber-400/20 text-amber-100",
        cardBorder: "border-amber-400/30",
        cardBg: "bg-amber-400/[0.05]",
        aura: "bg-amber-400/20",
        dial: "rgb(251, 191, 36)",
        Icon: AlertTriangle,
      };
  }
}

function severityPalette(severity: GeminiRisk["severity"]): {
  border: string;
  bg: string;
  text: string;
} {
  switch (severity) {
    case "high":
      return {
        border: "border-red-400/30",
        bg: "bg-red-400/[0.06]",
        text: "text-red-200",
      };
    case "medium":
      return {
        border: "border-amber-400/30",
        bg: "bg-amber-400/[0.06]",
        text: "text-amber-200",
      };
    case "low":
    default:
      return {
        border: "border-sky-400/30",
        bg: "bg-sky-400/[0.06]",
        text: "text-sky-200",
      };
  }
}

function friendlyCodeMessage(code: string): string {
  switch (code) {
    case "GEMINI_NOT_CONFIGURED":
      return "Gemini is not configured on this deployment.";
    case "GEMINI_REQUEST_FAILED":
      return "The request to Gemini failed. Try again in a moment.";
    case "GEMINI_INVALID_RESPONSE":
      return "Gemini returned an unparseable response. Try re-running the judge.";
    case "RATE_LIMITED":
      return "Too many judge requests. Please try again in a few minutes.";
    case "INVALID_REQUEST":
      return "The judge could not understand the request payload.";
    default:
      return "Gemini judge failed unexpectedly.";
  }
}
