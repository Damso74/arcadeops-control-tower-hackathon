"use client";

import {
  AlertTriangle,
  DollarSign,
  Eye,
  FileWarning,
  ListChecks,
  OctagonX,
  ShieldCheck,
  Sparkles,
  Wrench,
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
    };
  }, []);

  const runJudge = useCallback(async () => {
    if (!requestBody) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });

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
        setState({ status: "error", message });
        return;
      }
      setState({ status: "ready", result: payload.result });
      onResult?.(payload.result);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState({
        status: "error",
        message: (err as Error).message || "Failed to call Gemini.",
      });
    }
  }, [requestBody, onResult]);

  // While we are still discovering availability, render nothing — avoids
  // a flash of "not configured" on slow networks.
  if (available === null) return null;

  if (!available) {
    return (
      <aside
        aria-label="Gemini reliability judge availability"
        className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-xs text-zinc-500"
      >
        <span className="font-medium text-zinc-400">
          Gemini reliability judge
        </span>{" "}
        is available when configured. The page works fully without it — set{" "}
        <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-zinc-300">
          GEMINI_API_KEY
        </code>{" "}
        to enable a live production-readiness verdict on every run.
      </aside>
    );
  }

  const disabled =
    Boolean(disabledOverride) || !requestBody || state.status === "loading";

  return (
    <section
      aria-label="Gemini reliability judge"
      className="flex flex-col gap-5 rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/[0.06] via-white/[0.02] to-blue-500/[0.06] p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
              <Sparkles className="h-3 w-3" aria-hidden />
              Powered by Gemini
            </span>
            {model ? (
              <span className="font-mono text-[10px] text-zinc-500">
                {model}
              </span>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold text-zinc-50">
            Reliability Judge
          </h3>
          <p className="max-w-xl text-sm text-zinc-400">
            Server-side Gemini reads the agent trace and decides whether the
            run can ship to production.
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
              <Spinner /> Judging…
            </>
          ) : state.status === "ready" ? (
            "Re-run Gemini judge"
          ) : (
            actionLabel ?? "Run Gemini reliability judge"
          )}
        </button>
      </header>

      {!requestBody ? (
        <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
          {emptyHint ??
            "Choose a run, replay the safe sample, or paste a trace — Gemini needs evidence before it can judge."}
        </p>
      ) : null}

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
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${meta.classes}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {meta.label}
          </span>

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
        </div>
      </div>
    </article>
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
