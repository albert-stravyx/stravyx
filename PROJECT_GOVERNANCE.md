# Stravyx Project Governance

These rules are project-owned and apply to humans and AI collaborators regardless of runtime. Factory internals may change; these project safeguards do not disappear when switching tools.

## Human delivery gates
The following require explicit human authorization: commit, push, merge, release, deployment, production mutation, infrastructure apply, destructive operation, database migration apply, IAM/security-boundary changes, payment/pricing changes and secret rotation.

## Architecture and domain constraints
- First-to-accept dispatch is authoritative.
- Money uses integer cents.
- Visibility is enforced by shared projectors + API/Edge + RLS, never UI-only.
- Roles source from `app_metadata` / approved profile fields.
- Browser marketplace business logic uses `packages/api-client`; direct PostgREST access must not bypass business boundaries.
- HubSpot is one-way after persist.
- New production dependencies require approval.
- Architecture-boundary changes require an ADR and independent architecture challenge.

## Security, privacy and data
- Never commit secrets, provider tokens, private keys or service-role credentials.
- Never persist raw prompts, customer data or source contents in factory telemetry by default.
- Auth/RBAC/RLS/security-boundary work is high risk and requires independent review.
- Production writes through MCP/tools require human approval.

## Quality
- Strong type checking is mandatory; do not manufacture a pass with broad `any`, unchecked casts or disabled checks.
- New behavior needs tests proportional to risk; failure paths are required.
- Critical user flows require applicable BDD/E2E coverage.
- Accessibility target is WCAG 2.2 AA.
- Frontend production diffs require independent `senior-frontend-reviewer`.
- High-risk work requires cross-family review, rollback/recovery evidence and human understanding.

## Autonomy
Autonomous writes are bounded by `.agent/policy.json`, task scope and path ownership. Parallel writers require isolated worktrees/non-overlapping ownership. Repeated identical failure becomes blocked; agents may not bypass gates to claim completion.

## MCP/tool policy
GitHub, Vercel, Supabase, HubSpot, Twilio and Playwright connector declarations are retained. Exact credentials and endpoints are environment-specific and must not be committed. Stripe remains disabled until explicitly approved for its later project phase. Production defaults read-only unless a project policy and human approval permit otherwise.

## Change control
Safeguards may be strengthened through normal review. Weakening a risk floor, security/privacy control, independent-review rule, human approval gate or production permission requires explicit human decision and must never be performed by optimization automatically.
