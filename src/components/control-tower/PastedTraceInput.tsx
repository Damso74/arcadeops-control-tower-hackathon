"use client";

import { ClipboardPaste } from "lucide-react";
import { useId, useMemo } from "react";

interface PastedTraceInputProps {
  value: string;
  onChange: (next: string) => void;
  onLoadExample?: () => void;
  onClear?: () => void;
  /** Hard cap mirrored from the server route to fail fast in the browser. */
  maxChars: number;
}

const PLACEHOLDER = `Paste logs, JSON traces, tool calls, LangGraph/CrewAI outputs, MCP tool logs, browser-agent steps, or an incident report.

Gemini will judge whether this run is production-ready.`;

/**
 * Free-form trace input — V5 polished:
 *   - clearer header with paste icon,
 *   - explicit "trace too long" copy,
 *   - reassuring sub-text reminding the user the trace is not stored.
 */
export function PastedTraceInput({
  value,
  onChange,
  onLoadExample,
  onClear,
  maxChars,
}: PastedTraceInputProps) {
  const textareaId = useId();
  const helpId = useId();

  const trimmedLength = value.trim().length;
  const overLimit = value.length > maxChars;
  const tooShort = trimmedLength > 0 && trimmedLength < 20;
  const counterTone = useMemo(() => {
    if (overLimit) return "text-red-300";
    if (value.length > maxChars * 0.85) return "text-amber-200";
    return "text-zinc-500";
  }, [value.length, maxChars, overLimit]);

  return (
    <section className="flex flex-col gap-3" aria-label="Paste an AI agent trace">
      <header className="flex flex-col gap-1">
        <label
          htmlFor={textareaId}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-100"
        >
          <ClipboardPaste className="h-4 w-4 text-violet-300" aria-hidden />
          Paste an AI agent trace
        </label>
        <p id={helpId} className="text-xs leading-relaxed text-zinc-400">
          Your trace is sent to the server-side Gemini judge for this request
          only. It is not stored by this demo.
        </p>
      </header>

      <textarea
        id={textareaId}
        aria-describedby={helpId}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          // Hard-stop at maxChars — prevents the textarea from growing past
          // the server-side limit, no need for round-trips to discover it.
          onChange(next.length > maxChars ? next.slice(0, maxChars) : next);
        }}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        rows={10}
        className="min-h-[220px] w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] p-4 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {onLoadExample ? (
            <button
              type="button"
              onClick={onLoadExample}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            >
              Load unsafe example
            </button>
          ) : null}
          {value.length > 0 && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className={`text-[11px] tabular-nums ${counterTone}`}>
          {value.length.toLocaleString()} / {maxChars.toLocaleString()}
          {tooShort ? " · need at least 20 chars" : ""}
          {overLimit ? " · over limit" : ""}
        </div>
      </div>

      {overLimit ? (
        <p className="rounded-md border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs text-red-200">
          Trace is too long for this public demo. Keep it under{" "}
          {maxChars.toLocaleString()} characters before judging.
        </p>
      ) : null}
    </section>
  );
}
