---
name: other-model-judge
description: Builds a compact judge packet and a cache-stable Task preamble before launching Claude, Gemini, or GPT specialist judges. Use when launching architecture-challenger, senior-frontend-reviewer, senior-backend-reviewer, senior-ai-reviewer, security-reviewer, or ai-eval-analyst, or when reducing Other Models token use.
---

# Other Model judge packets

Runtime-native research agents explore the repo. Independent reviewer models judge a compact packet when cross-family review is required.

Provider prompt cache only helps when the **token prefix is identical** and there is a later turn. These judges are usually one-shot, so the first-turn win is **not reading the handoff corpus**.

## Before launching a judge

1. Run `python scripts/build_judge_packet.py --role <role>` from the repo root (or assemble the same fields by hand).
2. Launch the Other Model agent with this **byte-stable** preamble, then only the packet path and role:

```
Follow `skills/project/other-model-judge/SKILL.md`.
Read `skills/project/other-model-judge/stable-prefix.md` then the packet path given below.
Do not read AGENTS.md, PROJECT.md, or docs/ unless the packet lists a specific file.
```

3. If the judge asks for a missing file, the parent/orchestrator fetches that one file, patch the packet, and relaunch. The judge does not explore.
4. Nested `codebase-researcher` is allowed only when the packet is insufficient. It returns findings **into the packet**, not a raw file dump into the judge context.

Do not put timestamps, implementer narrative, or a second copy of AGENTS.md in the preamble. Those bust the cache and double Other Models input.

Roles this applies to: `architecture-challenger`, `senior-frontend-reviewer`, `senior-backend-reviewer`, `senior-ai-reviewer`, `security-reviewer`, `ai-eval-analyst`.

## Packet location

`.agent/packets/<task-id>-<role>.md` (gitignored). Field list: [packet-template.md](packet-template.md). Rubric: [stable-prefix.md](stable-prefix.md).
