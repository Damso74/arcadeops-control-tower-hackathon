/**
 * UX V2.2 §14 — Agent Risk Map / Agent Pipeline.
 *
 * Compact horizontal flow rendered inside the Selected Run Summary
 * card. Each scenario gets its own narrative chain so a judge sees
 * "where" the agent broke (or stayed clean) at a glance:
 *
 *   - Critical CRM run → CEO → Support → CRM ⚠️ → Email ⚠️ → Control Tower 🛑
 *   - Support draft   → Support Agent → Draft Reply ⚠️ → Missing Confidence → Control Tower ⏸
 *   - Safe research   → Research Agent → Browser Tool → Audit Trail → Gemini Judge → Gate Open ✅
 *
 * Pure presentational — no fetches, no state.
 */
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  OctagonX,
  Pause,
  type LucideIcon,
} from "lucide-react";

import type { TraceScenario } from "@/lib/control-tower/scenarios";

interface PipelineNode {
  label: string;
  tone: "neutral" | "danger" | "warning" | "success";
  icon?: LucideIcon;
}

interface PipelineDef {
  caption: string;
  nodes: readonly PipelineNode[];
}

const PIPELINES: Record<string, PipelineDef> = {
  multi_agent_escalation: {
    caption: "How the multi-agent run reaches the gate",
    nodes: [
      { label: "CEO Agent", tone: "neutral" },
      { label: "Support Agent", tone: "neutral" },
      { label: "CRM Agent", tone: "danger", icon: AlertTriangle },
      { label: "Email Agent", tone: "danger", icon: AlertTriangle },
      { label: "Control Tower", tone: "danger", icon: OctagonX },
    ],
  },
  blocked_crm_write_agent: {
    caption: "How the CRM cleanup run reaches the gate",
    nodes: [
      { label: "CRM Agent", tone: "neutral" },
      { label: "Bulk Write", tone: "danger", icon: AlertTriangle },
      { label: "Outbound Email", tone: "danger", icon: AlertTriangle },
      { label: "Control Tower", tone: "danger", icon: OctagonX },
    ],
  },
  needs_review_support_agent: {
    caption: "How the support draft reaches the gate",
    nodes: [
      { label: "Support Agent", tone: "neutral" },
      { label: "Draft Reply", tone: "warning", icon: AlertTriangle },
      { label: "Missing Confidence", tone: "warning", icon: AlertTriangle },
      { label: "Control Tower", tone: "warning", icon: Pause },
    ],
  },
  ready_research_agent: {
    caption: "How the safe run reaches the gate",
    nodes: [
      { label: "Research Agent", tone: "neutral" },
      { label: "Browser Tool", tone: "neutral" },
      { label: "Audit Trail", tone: "success" },
      { label: "Gemini Judge", tone: "success" },
      { label: "Gate Open", tone: "success", icon: CheckCircle2 },
    ],
  },
};

const FALLBACK_PIPELINE: PipelineDef = {
  caption: "Agent pipeline",
  nodes: [
    { label: "Agent", tone: "neutral" },
    { label: "Tool calls", tone: "neutral" },
    { label: "Audit trail", tone: "neutral" },
    { label: "Control Tower", tone: "neutral" },
  ],
};

interface AgentPipelineDiagramProps {
  scenario: TraceScenario | null;
}

export function AgentPipelineDiagram({ scenario }: AgentPipelineDiagramProps) {
  const pipeline =
    (scenario && PIPELINES[scenario.id]) ?? FALLBACK_PIPELINE;

  return (
    <section
      aria-label="Agent pipeline"
      className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3"
    >
      <header className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Agent pipeline
        </span>
        <span className="text-[10px] text-zinc-500">{pipeline.caption}</span>
      </header>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[11px]">
        {pipeline.nodes.map((node, idx) => {
          const NodeIcon = node.icon;
          const palette = pipelineNodePalette(node.tone);
          return (
            <li key={`${node.label}-${idx}`} className="inline-flex items-center gap-1.5">
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium",
                  palette,
                ].join(" ")}
              >
                {NodeIcon ? <NodeIcon className="h-3 w-3" aria-hidden /> : null}
                <span className="whitespace-nowrap">{node.label}</span>
              </span>
              {idx < pipeline.nodes.length - 1 ? (
                <ArrowRight aria-hidden className="h-3 w-3 flex-none text-zinc-600" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function pipelineNodePalette(tone: PipelineNode["tone"]): string {
  switch (tone) {
    case "danger":
      return "border-red-400/30 bg-red-400/[0.08] text-red-100";
    case "warning":
      return "border-amber-400/30 bg-amber-400/[0.08] text-amber-100";
    case "success":
      return "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-100";
    case "neutral":
    default:
      return "border-white/15 bg-white/[0.04] text-zinc-200";
  }
}
