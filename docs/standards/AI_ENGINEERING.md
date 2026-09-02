# AI engineering standard

- LLM output is untrusted input and must pass schema/tool-policy validation before use.
- Deterministic services own prices, availability, permissions, tax, booking/payment state and other business facts.
- Production model output may not be the sole judge of its own quality for high-risk behaviour.
- AI changes require baseline/eval evidence and regression cases for discovered failures.
- Prompts do not override architecture, auth, validation or business invariants.
- Never add fallback hallucinated values when tools/data are unavailable; surface an explicit inability or typed dependency failure.
