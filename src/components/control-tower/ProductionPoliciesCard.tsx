import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import type { GeminiJudgeResult } from "@/lib/control-tower/gemini-types";

/**
 * Lot 2b (P0#9, master plan §5) — "Production policies enforced" card
 * surfaced inside the Decide section, listing the 5 deterministic
 * production gates always running on top of the Gemini verdict.
 *
 * Each row carries a status:
 *   - `triggered` (red) — the rule fired against the audited trace.
 *   - `enforced` (green) — the rule is armed but did not fire.
 *
 * The card has two render modes:
 *   - **No verdict yet** (`policyGate === null`) → all 5 rows are
 *     rendered as `armed` with a one-liner explaining what each gate
 *     checks. Pure pedagogy: a judge knows the rule catalogue before
 *     even running an audit.
 *   - **Verdict landed** → rows reflect the `policyGate.rules` payload
 *     attached to the result.
 */
export interface PolicyDescriptor {
  id: string;
  label: string;
  description: string;
}

const POLICIES: readonly PolicyDescriptor[] = [
  {
    id: "destructive_without_approval",
    label: "No destructive action without approval",
    description: "Block deletes / drops / purges that bypass a human gate.",
  },
  {
    id: "outbound_without_review",
    label: "No outbound message without review",
    description:
      "Block customer-facing emails / messages without explicit review.",
  },
  {
    id: "write_without_audit_or_replay",
    label: "Write actions need audit or replay",
    description:
      "Refuse state-changing operations that ship without an audit log.",
  },
  {
    id: "cost_budget_exceeded",
    label: "Cost ceiling enforced",
    description:
      "Cap runaway runs that exceed the configured per-tool budget.",
  },
  {
    id: "require_replay_id",
    label: "Run must be replayable",
    description:
      "Refuse runs that did not persist a replay id or audit trail.",
  },
];

interface ProductionPoliciesCardProps {
  /**
   * Result of the most recent Gemini audit. When `null` the card
   * renders all 5 rules in `armed` state (pre-audit pedagogy).
   */
  result: GeminiJudgeResult | null;
}

export function ProductionPoliciesCard({ result }: ProductionPoliciesCardProps) {
  const triggered = new Set<string>(
    result?.policyGate?.rules?.map((rule) => rule.id) ?? [],
  );
  const auditDone = result !== null;
  const triggeredCount = triggered.size;
  const armedCount = POLICIES.length - triggeredCount;

  return (
    <section
      aria-label="Production policies enforced by ArcadeOps"
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Production policies enforced
          </span>
          <span className="text-[10px] text-zinc-500">
            5 non-negotiable rules · server-side
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
          {auditDone ? (
            <>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-200">
                {armedCount} enforced
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  triggeredCount > 0
                    ? "bg-red-400/15 text-red-200"
                    : "bg-white/5 text-zinc-400"
                }`}
              >
                {triggeredCount} triggered
              </span>
            </>
          ) : (
            <span className="rounded-full bg-white/5 px-2 py-0.5 font-semibold text-zinc-400">
              Awaiting audit
            </span>
          )}
        </div>
      </header>

      <ul className="flex flex-col gap-1.5">
        {POLICIES.map((policy) => {
          const isTriggered = triggered.has(policy.id);
          return (
            <li key={policy.id}>
              <PolicyRow
                policy={policy}
                state={isTriggered ? "triggered" : auditDone ? "enforced" : "armed"}
              />
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] leading-relaxed text-zinc-500">
        Gemini reasons over the trace. ArcadeOps applies these
        non-negotiable production gates on top of the model verdict.
      </p>
    </section>
  );
}

type PolicyState = "triggered" | "enforced" | "armed";

function PolicyRow({
  policy,
  state,
}: {
  policy: PolicyDescriptor;
  state: PolicyState;
}) {
  const meta = (() => {
    switch (state) {
      case "triggered":
        return {
          icon: (
            <AlertTriangle
              className="h-3.5 w-3.5 text-red-300"
              aria-hidden
            />
          ),
          rowClass:
            "border-red-400/30 bg-red-400/[0.06] hover:border-red-400/50",
          stateBadge: "bg-red-400/15 text-red-200",
          stateLabel: "Triggered",
        };
      case "enforced":
        return {
          icon: (
            <CheckCircle2
              className="h-3.5 w-3.5 text-emerald-300"
              aria-hidden
            />
          ),
          rowClass:
            "border-white/10 bg-white/[0.03] hover:border-emerald-400/30",
          stateBadge: "bg-emerald-400/10 text-emerald-200",
          stateLabel: "Enforced",
        };
      case "armed":
      default:
        return {
          icon: (
            <ShieldAlert
              className="h-3.5 w-3.5 text-zinc-400"
              aria-hidden
            />
          ),
          rowClass: "border-white/10 bg-white/[0.02]",
          stateBadge: "bg-white/5 text-zinc-400",
          stateLabel: "Armed",
        };
    }
  })();

  return (
    <article
      className={`flex items-start gap-2 rounded-md border px-2.5 py-2 transition-colors ${meta.rowClass}`}
    >
      <span aria-hidden className="mt-0.5 flex-none">
        {meta.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-zinc-100">{policy.label}</span>
        <span className="text-[11px] leading-relaxed text-zinc-400">
          {policy.description}
        </span>
      </div>
      <span
        className={`ml-2 self-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.stateBadge}`}
      >
        {meta.stateLabel}
      </span>
    </article>
  );
}
