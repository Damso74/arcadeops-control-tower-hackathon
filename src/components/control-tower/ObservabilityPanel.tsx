"use client";

import {
  AlertTriangle,
  Coins,
  DollarSign,
  Gauge,
  Hash,
  Info,
  type LucideIcon,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import type { ControlTowerObservability } from "@/lib/control-tower/types";

import { Disclosure } from "./Disclosure";

interface ObservabilityPanelProps {
  observability: Omit<ControlTowerObservability, "type"> | null;
  /**
   * Decision-first compact layout: 4 headline KPIs + disclosure for the
   * full technical metrics + risk flags. Defaults to the legacy wide
   * grid used by the deterministic replay path so we don't change V0–V3
   * behaviour for the safe-sample view.
   */
  compact?: boolean;
}

export function ObservabilityPanel({
  observability,
  compact = false,
}: ObservabilityPanelProps) {
  if (!observability) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-500">
        Observability metrics will appear when the agent run reports usage.
      </div>
    );
  }

  if (!compact) {
    const metrics: Array<{ label: string; value: string }> = [
      { label: "Provider", value: observability.provider },
      { label: "Model", value: observability.model },
      { label: "Input tokens", value: formatNumber(observability.inputTokens) },
      { label: "Output tokens", value: formatNumber(observability.outputTokens) },
      { label: "Total tokens", value: formatNumber(observability.totalTokens) },
      { label: "Total cost", value: formatUsd(observability.costUsd) },
      { label: "Latency", value: formatDuration(observability.latencyMs) },
      { label: "Tool calls", value: String(observability.toolCallsCount) },
    ];
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {m.label}
              </div>
              <div className="mt-1 font-mono text-base text-zinc-100">
                {m.value}
              </div>
            </div>
          ))}
        </div>
        {observability.riskFlags.length > 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Risk flags
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {observability.riskFlags.map((flag) => (
                <li
                  key={flag}
                  className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                >
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  // Compact decision-first layout — the path used for textual scenarios.
  const headline: HeadlineKpi[] = [
    {
      label: "Cost",
      icon: DollarSign,
      value: formatUsd(observability.costUsd),
    },
    {
      label: "Tokens",
      icon: Coins,
      value: formatNumber(observability.totalTokens),
    },
    {
      label: "Tools",
      icon: Wrench,
      value: String(observability.toolCallsCount),
    },
    {
      label: "Flags",
      icon: ShieldAlert,
      value: String(observability.riskFlags.length),
      tone:
        observability.riskFlags.length === 0
          ? "neutral"
          : observability.riskFlags.length <= 2
            ? "warning"
            : "danger",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {headline.map((m) => (
          <Kpi key={m.label} kpi={m} />
        ))}
      </div>

      <Disclosure label="View technical metrics">
        <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            icon={Info}
            label="Provider"
            value={observability.provider}
          />
          <Detail icon={Hash} label="Model" value={observability.model} />
          <Detail
            icon={Gauge}
            label="Latency"
            value={formatDuration(observability.latencyMs)}
          />
          <Detail
            icon={Coins}
            label="Input tokens"
            value={formatNumber(observability.inputTokens)}
          />
          <Detail
            icon={Coins}
            label="Output tokens"
            value={formatNumber(observability.outputTokens)}
          />
        </div>

        {observability.riskFlags.length > 0 ? (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Risk flags ({observability.riskFlags.length})
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {observability.riskFlags.map((flag) => (
                <li
                  key={flag}
                  className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs text-amber-100"
                >
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Disclosure>
    </div>
  );
}

interface HeadlineKpi {
  label: string;
  icon: LucideIcon;
  value: string;
  tone?: "neutral" | "warning" | "danger";
}

function Kpi({ kpi }: { kpi: HeadlineKpi }) {
  const palette =
    kpi.tone === "danger"
      ? "border-red-400/30 bg-red-400/[0.05] text-red-200"
      : kpi.tone === "warning"
        ? "border-amber-400/25 bg-amber-400/[0.05] text-amber-200"
        : "border-white/10 bg-white/[0.03] text-zinc-300";
  const Icon = kpi.icon;
  return (
    <div className={`rounded-lg border px-4 py-3 ${palette}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
        <Icon className="h-3 w-3" aria-hidden />
        {kpi.label}
      </div>
      <div className="mt-1 font-mono text-lg text-zinc-50">{kpi.value}</div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </div>
      <div className="font-mono text-sm text-zinc-200">{value}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatUsd(n: number): string {
  return `$${n.toFixed(n < 1 ? 3 : 2)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}
