# Agent history archive

Human-readable insurance from Cursor conversations (May–Aug 2026). Rebuilt **2026-08-22** from local `agent-transcripts` in this workspace, plus `SearchConversations` titles for chats that have no jsonl here.

Future agents and a new machine **will not** see the original chats. Prefer live docs for day-to-day authority; use this archive for *why*, quoted questions, and incident history.

## Files

| File | Contents |
|------|----------|
| [architecture.md](./architecture.md) | Board → 1A/2A topology, ADRs 0001–0005, DJI live-ops, control plane, rejections |
| [authentication.md](./authentication.md) | Roles, JWT/Edge, Switch View removal, demo redirects, authz |
| [deployment.md](./deployment.md) | Vercel, CI, Replit, env/build gotchas, branch cleanup |
| [database-redesign.md](./database-redesign.md) | ERD v0.1→v0.3.1, leads Domain H, HubSpot SoT boundary |
| [debugging-history.md](./debugging-history.md) | Incident log + playbooks |

## Authority order

1. `docs/data-model-erd.md` (v0.3.1)
2. `docs/backend-build-plan.md` + `docs/adr/*`
3. Handoff set: `docs/AGENT_HANDOFF.md`, `DECISIONS`, `ARCHITECTURE`, `CURRENT_STATE`, `KNOWN_ISSUES`
4. This archive (narrative insurance — may lag)

## How this was produced

- **Copied where possible:** user questions from jsonl transcripts (quoted). Assistant answers distilled, not dumped.
- **Omitted:** MCP/tool boilerplate, “continue”, commit-and-push mechanics, Play Academy chats (other product), **all secret values**.
- **Not on disk here:** some early board chats appear in Cursor search (`a314328a` and similar) but have **no** jsonl under this project’s `agent-transcripts/`. Those are summarised from search snippets + live ADRs only.

## Secrets that appeared in chat (do not copy)

Rotate if still live — values are **not** stored in this archive:

- HubSpot private app token pasted in [Backend integration for users](9301a4c5-1562-4524-a9bf-f83d42eeba49)
- HubSpot MCP OAuth client id/secret pasted in [HubSpot MCP inquiry](fed4c309-8f20-41e4-98c6-6512fbeb3ead)
- MapTiler publishable key pasted during Vercel setup (`ee51ac3b`)

## Conversation ids

Ids like `8348c06d-…` are Cursor conversation / transcript folder names. Cite in new chats as `[title](uuid)`.

## Update rule

When a chat produces a durable decision, bug, or infra change, update the matching live doc **and** append a short note here (`.cursor/rules/90-context-maintenance.mdc`).
