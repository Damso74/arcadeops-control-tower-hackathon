"use client";

import { Cpu, MapPin, Radio, Server } from "lucide-react";
import { useEffect, useState } from "react";

import {
  type HealthSnapshot,
  pollHealth,
} from "@/lib/control-tower/health-probe";

/**
 * Lot 2a (P1#16) — "Infrastructure proof" card rendered right under
 * the Gemini decision card. Surfaces *where* the runtime actually
 * lives (Vultr / Docker / FastAPI / region `fra`) plus a live status
 * pastille fed by `/api/health` polling.
 *
 * Goal: convince the jury at a glance that the cockpit is wired to a
 * real cloud backend (one of the explicit Milan AI Week sponsors),
 * not just a static demo prop.
 *
 * No props — fully self-contained. Stops the polling loop on
 * unmount via the cleanup returned by `pollHealth`.
 */
export function InfrastructureProofCard({
  /**
   * Optional latency hint (in ms) for the most recent Gemini audit.
   * When provided, it is surfaced as "Last audit latency" so the
   * jury sees end-to-end timing at a glance.
   */
  lastAuditLatencyMs,
}: {
  lastAuditLatencyMs?: number | null;
}) {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);

  useEffect(() => {
    const stop = pollHealth(setSnapshot, { intervalMs: 30_000 });
    return stop;
  }, []);

  const status = snapshot?.status ?? "online";
  const latencyText = formatLatency(snapshot?.latencyMs);
  const auditLatencyText =
    typeof lastAuditLatencyMs === "number"
      ? formatLatency(lastAuditLatencyMs)
      : null;
  const region = snapshot?.region ?? "fra";

  return (
    <aside
      role="complementary"
      aria-label="Vultr infrastructure proof"
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4"
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
          <Server className="h-3 w-3" aria-hidden />
          Infrastructure proof
        </span>
        <StatusPastille status={status} />
        <span className="text-[10px] text-zinc-500">
          {snapshot
            ? `Probed ${latencyText} · ${formatTimestamp(snapshot.timestamp)}`
            : "Probing…"}
        </span>
      </header>

      <ul className="grid gap-2 text-xs text-zinc-300 sm:grid-cols-2">
        <ProofRow
          icon={<Cpu className="h-3.5 w-3.5 text-cyan-300" aria-hidden />}
          label="Backend"
          value="Vultr Cloud Compute"
        />
        <ProofRow
          icon={<Server className="h-3.5 w-3.5 text-cyan-300" aria-hidden />}
          label="Runtime"
          value="Docker + FastAPI (Python 3.12)"
        />
        <ProofRow
          icon={<MapPin className="h-3.5 w-3.5 text-cyan-300" aria-hidden />}
          label="Region"
          value={`${region.toUpperCase()} · Frankfurt`}
        />
        <ProofRow
          icon={<Radio className="h-3.5 w-3.5 text-cyan-300" aria-hidden />}
          label="Status"
          value={statusLabel(status)}
        />
        {auditLatencyText ? (
          <ProofRow
            icon={
              <Radio className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
            }
            label="Last audit latency"
            value={auditLatencyText}
          />
        ) : null}
      </ul>
    </aside>
  );
}

function ProofRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <span aria-hidden className="grid h-5 w-5 flex-none place-items-center">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <span className="truncate font-mono text-[11px] text-zinc-100">
          {value}
        </span>
      </div>
    </li>
  );
}

function StatusPastille({ status }: { status: HealthSnapshot["status"] }) {
  const meta = (() => {
    switch (status) {
      case "online":
        return {
          dot: "bg-emerald-400",
          ring: "bg-emerald-400/30",
          text: "text-emerald-200",
          label: "Online",
        };
      case "degraded":
        return {
          dot: "bg-amber-400",
          ring: "bg-amber-400/30",
          text: "text-amber-200",
          label: "Degraded",
        };
      case "offline":
      default:
        return {
          dot: "bg-red-400",
          ring: "bg-red-400/30",
          text: "text-red-200",
          label: "Offline",
        };
    }
  })();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.text}`}
    >
      <span aria-hidden className="relative inline-flex h-2 w-2">
        <span
          className={`absolute inset-0 inline-flex h-2 w-2 animate-ping rounded-full ${meta.ring}`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`}
        />
      </span>
      {meta.label}
    </span>
  );
}

function statusLabel(status: HealthSnapshot["status"]): string {
  switch (status) {
    case "online":
      return "Online";
    case "degraded":
      return "Degraded";
    case "offline":
    default:
      return "Offline";
  }
}

function formatLatency(ms: number | null | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "now";
  }
}
