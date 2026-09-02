# Testing standard

- Use TDD for deterministic domain behaviour when practical: failing assertion, minimum behaviour, refactor.
- BDD scenarios describe user/business behaviour rather than internal method names.
- Unit tests cover rules and failure conditions; integration tests cover boundaries/contracts; E2E covers critical journeys.
- Tests must not be weakened to accommodate an implementation defect.
- Prefer observable behaviour over private implementation assertions.
- Every production bug fixed should add a regression test at the lowest useful layer.
- Error tests assert diagnostic code and meaningful troubleshooting evidence, not only status code.
