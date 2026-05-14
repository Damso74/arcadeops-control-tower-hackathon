# Post-hackathon backlog

> Issues we knowingly punted past the freeze (`v1.0.0-hackathon-submit`)
> because (a) they don't change the live demo numbers, (b) the freeze
> rule was "no code-source `.ts/.tsx/.py` changes after the freeze
> commit". Every item here is a UX-clarity or polish task — none is a
> correctness bug.

## P2 — UX consistency: gating + label of the live Vultr + Gemini run button

The button that triggers the live Gemini + Vultr run on
`/control-tower` is currently labeled **"⚡ Run live with ArcadeOps
backend"** with a violet **"Gemini + Vultr"** inline pill, rendered
inside the `DemoMissionLauncher` component
(`src/components/control-tower/DemoMissionLauncher.tsx`, around
line 220).

It is **only visible after** the user clicks the small dotted text
link _"Or replay the deterministic safe sample (no key required)"_ at
the bottom of panel 1 (`TraceScenarioPicker.tsx`, the `ReplayLink`
helper). On default scenario mode, the only Gemini-action button on
the page is the **purple "Run Gemini judge"** in panel 3
(`GeminiJudgePanel`, action label resolved by `actionLabelFor("scenario")`
in `ControlTowerExperience.tsx`), which only audits the bundled
scenario trace fixture and never POSTs to the Vultr runner.

For the hackathon submission we worked around it in the docs — see
the commit
`docs(demo): align HOW_TO_DEMO + VIDEO_SCRIPT + README + SUBMISSION with real /control-tower UI`
(`350ba6f`) which spells out the prerequisite click everywhere.

### Why this hurts the pitch narrative

The pitch is _"Gemini runs the agent. Vultr executes the workflow.
ArcadeOps decides if it can ship."_ A first-time judge landing on the
page sees one big red **"Audit unsafe run"** button (scenario picker)
and a less-prominent purple **"Run Gemini judge"** further down. The
green CTA — the one that actually proves Vultr is part of the loop —
is gated behind a quiet text link they have no incentive to click.

### Suggested fix (post-freeze)

Pick **one** of:

1. **Promote the live launcher to panel 1.** Always render
   `DemoMissionLauncher` in panel 2 when `RUNNER_URL` is set, even in
   scenario mode. The scenario evidence timeline can move into a
   collapsible disclosure, or share the panel with the launcher in a
   side-by-side layout on `md+` viewports.
2. **Auto-switch to replay mode on first load** when `RUNNER_URL` is
   set, so the green button is the default visible CTA. Keep the
   scenario picker as the explicit fallback.
3. **Rename and re-skin the action.** Drop the "Run live with
   ArcadeOps backend" wording in favor of something the pitch deck
   already uses verbatim: **"Run live with Gemini + Vultr"** (or
   split into two CTAs: "Run live (Gemini + Vultr)" / "Audit a trace
   (Gemini judge)") so the green and purple buttons are unambiguously
   different products, not two flavors of the same Gemini call.

Whichever path is picked, also pin a sticky CTA at the top of the page
(e.g. a hero-level button next to the existing badges) so the live
demo is one click from the fold on a 1080p viewport.

**Files to touch (rough estimate, not implemented during freeze):**

- `src/app/control-tower/page.tsx` — reorder children, optionally
  short-circuit `selection.mode = "replay"` on first render when
  `liveAvailable === true`.
- `src/components/control-tower/ControlTowerExperience.tsx` — gating
  logic + section ordering.
- `src/components/control-tower/DemoMissionLauncher.tsx` — button
  label / inline pill if option (3) is picked.
- `src/components/control-tower/TraceScenarioPicker.tsx` — promote
  the `ReplayLink` from a quiet text link to a visible card if option
  (1) is picked.

## P3 — Asset checklist alignment in `docs/VIDEO_SCRIPT_90S.md`

The asset checklist still references `01_hero.png` as showing "the
tagline and 'Run live with ArcadeOps' CTA". With the gating described
in P2 above, the green CTA is below the fold on the default load. The
checklist already carries a parenthetical note about this, but a
re-shoot of `01_hero.png` post-fix would cleanly remove the workaround.

## P3 — Video URL placeholder

`docs/SUBMISSION_LABLAB.md` and `CHANGELOG.md` still carry
`[TO BE FILLED]` / `[TBD]` markers for the demo video URL and the
submission date. They are intentionally left as placeholders during
the freeze; replace them in a post-submission `chore(submit)` commit
once the video is uploaded and the Lablab.ai entry is live.
