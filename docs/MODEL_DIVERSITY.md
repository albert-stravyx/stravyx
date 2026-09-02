# Cross-model implementation and review

The workflow deliberately separates implementers and reviewers by both **role** and, for consequential work, **model family**. This reduces correlated blind spots; it does not make model output authoritative.

Live slugs come from `.agent/models.json` `profiles[active_profile]`. Check with `pnpm models:show`. Full tables and toggle steps: [agent-model-assignments.md](./agent-model-assignments.md).

## Active profile

- **quality** (default): flagship Claude / GPT / Gemini judges; Composer and Grok Fast only on high-volume research/tests and final code review.
- **economy** (opt-in): Grok 4.6 High + Composer for generation; Gemini/Sonnet only as short independent judges.

Before an autonomous run, execute `pnpm models:show` and compare with Cursor `agent models` / `/models`. If a named model is unavailable, use an approved different-family alternative from that profile and record the substitution. Do not toggle profiles mid-slice.

## Blind-review context

A reviewer receives a judge packet (`.cursor/skills/other-model-judge/`), the target slice, allowed-path diff, test/eval results and cited snippets. It should not be anchored by the implementer's self-review, the handoff corpus, or a long debugging narrative.

## Disagreement protocol

1. Compare both positions with approved product/architecture/program-design artefacts.
2. If an approved decision resolves it, follow that decision.
3. If not, invoke the appropriate challenger/reviewer.
4. Consequential unresolved disagreement becomes `BLOCKED` for human decision.
