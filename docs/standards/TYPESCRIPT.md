# TypeScript standard

- Enable strict mode and keep `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noImplicitReturns`, `noImplicitOverride` and `noFallthroughCasesInSwitch` enabled where supported.
- Never use `any` as an error escape. Start untrusted input as `unknown`, validate it, then infer/use the trusted type.
- Avoid `as` assertions where a schema, type guard or discriminated union can establish the fact.
- `null`/`undefined` must have distinct documented semantics. Expected absence may be nullable; unexpected failure must use the standard error/result contract.
- Prefer discriminated unions for finite state and expected business outcomes.
- Exhaustively handle union states; use a `never` exhaustiveness helper when appropriate.
- Avoid optional properties merely to make object construction convenient. Model required/optional fields from the domain.
- No `@ts-ignore`, `@ts-nocheck` or blanket `eslint-disable` without a reviewed quality waiver.
