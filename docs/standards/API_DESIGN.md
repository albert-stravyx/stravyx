# API design standard

- Validate request inputs at the boundary and return a typed response contract.
- Use stable machine-readable error codes plus human-readable details, correlation IDs, retryability and suggested action where useful.
- Never expose stack traces, secrets or internal infrastructure details to clients.
- Commands vulnerable to retries require idempotency where business impact warrants it.
- Distinguish validation, conflict, not-found, permission, dependency and internal failures.
- Preserve causal evidence in server logs/traces with correlation IDs.
- API handlers remain thin; orchestration belongs in application services and rules belong in domain modules.
