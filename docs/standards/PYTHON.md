# Python standard

- `mypy --strict` is the baseline for typed Python application code.
- Do not use `typing.Any` to bypass a boundary. Prefer `object`, Protocols, TypedDict/Pydantic models, TypeVar/generics or an explicit JSON value union.
- Public functions/methods require explicit parameter and return types.
- Validate untrusted data before constructing domain types.
- Use immutable/frozen value objects where mutation is not part of the domain.
- Do not swallow exceptions. Preserve causal evidence with exception chaining/logging at the correct boundary.
- Avoid broad `except Exception` except at process/API boundaries where it is logged and converted to a safe diagnostic.
- Keep pure domain modules independent of frameworks, cloud SDKs and persistence providers.
- No blanket `# type: ignore`; exceptional narrow suppressions require a reviewed waiver and specific checker code where possible.
