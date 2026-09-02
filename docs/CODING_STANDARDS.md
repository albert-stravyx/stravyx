# Coding standards and maintainability contract

The repository optimises for code that another engineer can understand, change and safely operate later. Passing tests is necessary but not sufficient.

## Required decision order

1. Follow the approved product brief and architecture.
2. Follow the approved Program Design: file plan, contracts, signatures, state transitions, error model and assertions.
3. Search for an existing repository pattern before inventing a new abstraction.
4. Implement the smallest vertical slice that proves behaviour end to end.
5. Keep types precise and validate external/AI data before it enters trusted domain code.
6. Return informative typed errors; never hide failures with `null`, `None`, empty values or swallowed exceptions.
7. Run machine quality guards, static analysis, tests and independent cross-model review.

## Non-negotiable anti-slop rules

- Do not introduce `any`, `typing.Any`, double assertions, blanket type/lint suppressions or disabled compiler rules merely to make code pass.
- Do not use `null`/`None` as a generic failure channel. Nullable values must represent a documented domain state such as legitimate absence.
- Do not invent `0`, `""`, `[]` or `{}` for missing required business data. Defaults require an explicit domain rule.
- Do not swallow exceptions with `pass`, `return None` or generic success responses.
- Do not leave unticketed TODO/FIXME/HACK placeholders in production source.
- Do not duplicate a pattern because it is easier than understanding the existing abstraction; equally, do not create generic factories/managers merely to remove tiny duplication.
- Do not mix transport/framework/database/provider concerns into pure domain logic.
- Do not leave commented-out code, dead experimental branches or mocks in production paths.
- Do not weaken tests, eval thresholds, types or quality policy to make a failing implementation appear complete.

## Existing-pattern-first rule

Before a new cross-cutting pattern is introduced, the Program Designer must document:

- the existing patterns inspected;
- why they do or do not fit;
- the proposed pattern and its scope;
- migration/compatibility impact;
- test and failure behaviour.

A new cross-cutting abstraction is a design decision, not an implementation convenience.

## Maintainability review

Senior review must explicitly look for type escapes, misleading optionality, speculative fallbacks, swallowed errors, magic values, excessive branching, oversized units, duplication, over-abstraction, inappropriate coupling, boundary leakage, weak naming and tests that assert implementation details rather than behaviour.
