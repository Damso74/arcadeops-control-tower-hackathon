"use client";

import { useCallback, useMemo, useState } from "react";

import type { JudgeRunSnapshot } from "@/lib/control-tower/gemini-types";

import { DemoMissionLauncher } from "./DemoMissionLauncher";
import { GeminiJudgePanel } from "./GeminiJudgePanel";

interface ControlTowerExperienceProps {
  liveAvailable: boolean;
}

/**
 * Top-level client wrapper that owns the cross-cutting state shared between
 * the replay panel and the Gemini Reliability Judge:
 *
 *   - the latest `JudgeRunSnapshot` (rebuilt every time the SSE stream
 *     produces fresh observability + result data),
 *   - the active mission prompt (used as evidence in the Gemini request).
 *
 * The judge panel is keyed on the snapshot signature so React naturally
 * remounts it (clearing stale state and aborting in-flight calls) when
 * the user starts a new run — no effect-driven reset needed.
 */
export function ControlTowerExperience({
  liveAvailable,
}: ControlTowerExperienceProps) {
  const [snapshot, setSnapshot] = useState<JudgeRunSnapshot | null>(null);
  const [missionPrompt, setMissionPrompt] = useState<string>("");

  const handleSnapshotReady = useCallback(
    (next: JudgeRunSnapshot | null, prompt: string) => {
      setSnapshot(next);
      setMissionPrompt(prompt);
    },
    [],
  );

  // Stable key derived from the public snapshot signature — used by
  // React to remount <GeminiJudgePanel> on every fresh run.
  const judgeKey = useMemo(() => {
    if (!snapshot) return "no-snapshot";
    return [
      snapshot.mission.id ?? snapshot.mission.title,
      snapshot.observability.totalTokens,
      snapshot.observability.costUsd,
      snapshot.toolCalls.length,
      snapshot.result.title,
    ].join("|");
  }, [snapshot]);

  return (
    <div className="flex flex-col gap-10">
      <DemoMissionLauncher
        liveAvailable={liveAvailable}
        onSnapshotReady={handleSnapshotReady}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Reliability judge
        </h2>
        <GeminiJudgePanel
          key={judgeKey}
          snapshot={snapshot}
          missionText={missionPrompt}
        />
      </section>
    </div>
  );
}
