# Test Data and Contracts

Use deterministic factories, fixtures and seed data. Do not use production customer data in automated tests. Independently changing layers must verify runtime contracts (HTTP/event/tool schemas) with provider/consumer or schema contract tests where applicable. Mock only external boundaries; prefer real domain logic and realistic local test infrastructure.
