# Error handling, diagnostics and strong type safety

## Error contract
Errors must be **actionable** rather than merely descriptive. A failure should expose enough safe context to diagnose it without leaking secrets or personal data.

For service/API boundaries use a structured error shape conceptually equivalent to:

```json
{
  "type": "https://example.invalid/problems/reservation-conflict",
  "title": "Reservation conflict",
  "status": 409,
  "code": "RESERVATION_CONFLICT",
  "detail": "The requested quantity is no longer available for the selected period.",
  "correlation_id": "...",
  "retryable": false,
  "context": {"product_id": "...", "requested_quantity": 80},
  "suggested_action": "Refresh availability and choose an alternative quantity or date."
}
```

### Rules
- Use stable machine-readable error codes.
- Include a correlation/request id at service boundaries.
- Separate user-safe `detail` from internal diagnostic logs.
- State whether retry is safe and under what condition.
- Include safe structured context: component, operation, relevant identifiers and constraint values.
- Include a suggested action or troubleshooting direction when possible.
- Chain/wrap the original exception internally; do not discard the cause.
- Never leak API keys, auth tokens, full stack traces, passwords, raw personal data or sensitive model prompts to clients.
- Unexpected exceptions map to a stable internal error and retain full server-side evidence.
- Tests must assert important failure paths, not only happy paths.

## Strong typing policy
`Any`, untyped dictionaries and unchecked casts are escape hatches requiring justification.

### Python
Use Python 3.12+, complete annotations, `mypy --strict`, Pydantic models at trust boundaries, typed Protocols/interfaces, explicit `None` handling and narrow exception types. Avoid bare `dict`, `list`, `except Exception` except at top-level error boundaries.

### TypeScript
Use `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `useUnknownInCatchVariables`. Validate external data with a runtime schema (for example Zod) before treating it as a trusted type. Do not cast `unknown` to domain types without validation.

### Cross-service contracts
Generate/share schemas where practical. Never rely on structurally similar hand-written types across services without contract tests.

## Required quality gates
A task cannot be COMPLETE while applicable lint, static type checking, contract/schema validation or failure-path tests are failing.
