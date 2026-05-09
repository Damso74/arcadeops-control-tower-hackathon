import type { ControlTowerObservability } from "@/lib/control-tower/types";

interface ObservabilityPanelProps {
  observability: Omit<ControlTowerObservability, "type"> | null;
}

export function ObservabilityPanel({ observability }: ObservabilityPanelProps) {
  if (!observability) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-500">
        Observability metrics will appear when the agent run reports usage.
      </div>
    );
  }

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
            <div className="mt-1 font-mono text-base text-zinc-100">{m.value}</div>
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
